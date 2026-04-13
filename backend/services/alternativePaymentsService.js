/**
 * Alternative Payments Service
 * Handles fiat, stablecoins, BNPL, and multiple payment providers
 */

const logger = require('../middleware/logger');

class AlternativePaymentsService {
  constructor(db, emailService) {
    this.db = db;
    this.email = emailService;
    this.stripeKey = process.env.STRIPE_SECRET_KEY;
    this.paypallApiKey = process.env.PAYPAL_API_KEY;
  }

  // =========================================================================
  // PAYMENT METHOD MANAGEMENT
  // =========================================================================

  /**
   * Add payment method
   */
  async addPaymentMethod(userId, paymentData) {
    try {
      const { type, provider, lastFourDigits, metadata } = paymentData;

      // Validate payment method
      if (!type || !['credit_card', 'bank_account', 'wallet', 'paypal', 'bnpl'].includes(type)) {
        throw new Error('Invalid payment method type');
      }

      const method = await this.db.paymentMethod.create({
        data: {
          userId,
          type,
          provider,
          lastFourDigits,
          metadata: JSON.stringify(metadata), // Encrypted in production
          isDefault: false,
        },
      });

      return {
        id: method.id,
        type: method.type,
        lastFour: method.lastFourDigits,
        createdAt: method.createdAt,
      };
    } catch (error) {
      logger.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Get user payment methods
   */
  async getPaymentMethods(userId) {
    try {
      return await this.db.paymentMethod.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          provider: true,
          lastFourDigits: true,
          isDefault: true,
          createdAt: true,
        },
      });
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      return [];
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId, paymentMethodId) {
    try {
      // Clear current defaults
      await this.db.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Set new default
      return await this.db.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      });
    } catch (error) {
      logger.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const method = await this.db.paymentMethod.findUnique({
        where: { id: paymentMethodId },
      });

      if (method?.userId !== userId) {
        throw new Error('Not authorized');
      }

      await this.db.paymentMethod.delete({
        where: { id: paymentMethodId },
      });

      return true;
    } catch (error) {
      logger.error('Error deleting payment method:', error);
      throw error;
    }
  }

  // =========================================================================
  // STRIPE PAYMENTS (Credit Cards, Bank Transfers)
  // =========================================================================

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(orderId, amount, currency = 'USD') {
    try {
      // In production, integrate with Stripe API
      // const stripe = require('stripe')(this.stripeKey);
      // const intent = await stripe.paymentIntents.create({...});

      const paymentIntent = {
        clientSecret: 'pi_' + Math.random().toString(36).substr(2, 9),
        amount,
        currency,
        status: 'requires_payment_method',
      };

      // Store transaction
      await this.db.paymentTransaction.create({
        data: {
          orderId,
          amount,
          currency,
          provider: 'stripe',
          status: 'pending',
          metadata: JSON.stringify({ paymentIntentId: paymentIntent.clientSecret }),
        },
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe payment
   */
  async confirmStripePayment(paymentIntentId, paymentMethodId) {
    try {
      // In production, call Stripe API
      // const stripe = require('stripe')(this.stripeKey);
      // await stripe.paymentIntents.confirm(paymentIntentId, {...});

      logger.info(
        `Confirming Stripe payment: ${paymentIntentId}`
      );

      // Update transaction
      const transaction = await this.db.paymentTransaction.findFirst({
        where: {
          metadata: {
            contains: paymentIntentId,
          },
        },
      });

      if (transaction) {
        await this.db.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        // Update order status
        await this.db.order.update({
          where: { id: transaction.orderId },
          data: {
            paymentStatus: 'completed',
            status: 'paid',
          },
        });
      }

      return { status: 'succeeded' };
    } catch (error) {
      logger.error('Error confirming Stripe payment:', error);
      throw error;
    }
  }

  // =========================================================================
  // STABLECOIN PAYMENTS (USDC, USDT, DAI)
  // =========================================================================

  /**
   * Get stablecoin payment details
   */
  async getStablecoinPaymentDetails(orderId, chain = 'ethereum', stablecoin = 'USDC') {
    try {
      const order = await this.db.order.findUnique({
        where: { id: orderId },
      });

      if (!order) throw new Error('Order not found');

      const STABLECOIN_ADDRESSES = {
        ethereum: { USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        polygon: { USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
        arbitrum: { USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F86' },
      };

      const tokenAddress = STABLECOIN_ADDRESSES[chain]?.[stablecoin];

      if (!tokenAddress) {
        throw new Error(
          `${stablecoin} not available on ${chain}`
        );
      }

      return {
        orderId,
        amount: order.total,
        stablecoin,
        chain,
        tokenAddress,
        recipientAddress: process.env.PAYMENT_WALLET_ADDRESS,
        memo: `Order #${order.orderNumber}`,
      };
    } catch (error) {
      logger.error('Error getting stablecoin payment details:', error);
      throw error;
    }
  }

  /**
   * Verify stablecoin payment (check blockchain)
   */
  async verifyStablecoinPayment(orderId, txHash, chain) {
    try {
      // In production, check RPC provider for transaction confirmation
      logger.info(`Verifying ${chain} transaction: ${txHash}`);

      // Store transaction
      const transaction = await this.db.paymentTransaction.create({
        data: {
          orderId,
          amount: 1, // Would get from blockchain
          currency: stablecoin,
          provider: chain,
          status: 'pending',
          providerTxId: txHash,
        },
      });

      // After verification, update to completed
      setTimeout(async () => {
        await this.db.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        // Update order
        await this.db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'completed',
            paymentTxHash: txHash,
            chain,
            status: 'paid',
          },
        });
      }, 5000); // Simulate blockchain confirmation

      return { verified: true, txHash };
    } catch (error) {
      logger.error('Error verifying stablecoin payment:', error);
      throw error;
    }
  }

  // =========================================================================
  // FIAT RAMPS (On/Off-Ramp)
  // =========================================================================

  /**
   * Create fiat on-ramp session (buy crypto with USD)
   */
  async createFiatOnRamp(userId, amount, targetChain = 'ethereum') {
    try {
      // In production, integrate with Ramp Network, Transak, etc
      const rampSession = {
        sessionId: 'ramp_' + Math.random().toString(36).substr(2, 9),
        provider: 'ramp',
        amount,
        targetChain,
        redirectUrl: `${process.env.APP_URL}/complete-purchase`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      logger.info(`Created fiat on-ramp session for user ${userId}`);

      return rampSession;
    } catch (error) {
      logger.error('Error creating fiat on-ramp:', error);
      throw error;
    }
  }

  /**
   * Create fiat off-ramp session (cash out crypto)
   */
  async createFiatOffRamp(userId, amount, bankAccount) {
    try {
      // In production, integrate with payment processor
      const offRampSession = {
        sessionId: 'offramp_' + Math.random().toString(36).substr(2, 9),
        provider: 'stripe_connect',
        amount,
        bankAccount: this.hashBankAccount(bankAccount),
        status: 'pending_verification',
      };

      logger.info(`Created fiat off-ramp session for user ${userId}`);

      return offRampSession;
    } catch (error) {
      logger.error('Error creating fiat off-ramp:', error);
      throw error;
    }
  }

  // =========================================================================
  // BUY NOW PAY LATER (BNPL)
  // =========================================================================

  /**
   * Get BNPL options for order
   */
  async getBNPLOptions(orderId, amount) {
    try {
      // In production, check eligibility with BNPL providers (Klarna, Affirm, etc)
      const bnplOptions = [
        {
          provider: 'klarna',
          name: 'Pay Later with Klarna',
          plans: [
            { name: 'Pay in 4', installments: 4, interestRate: 0 },
            { name: '3-Month Plan', installments: 3, interestRate: 0 },
            { name: '6-Month Plan', installments: 6, interestRate: 0.1 },
            { name: '12-Month Plan', installments: 12, interestRate: 0.15 },
          ],
        },
        {
          provider: 'affirm',
          name: 'Affirm',
          plans: [
            { name: 'Monthly Payments', installments: 3, interestRate: 0 },
            { name: '12-Month', installments: 12, interestRate: 0.1 },
          ],
        },
      ];

      // Calculate each plan
      return bnplOptions.map((provider) => ({
        ...provider,
        plans: provider.plans.map((plan) => ({
          ...plan,
          monthlyPayment: (
            amount /
            plan.installments *
            (1 + plan.interestRate)
          ).toFixed(2),
          totalCost: (
            amount *
            (1 + plan.interestRate)
          ).toFixed(2),
        })),
      }));
    } catch (error) {
      logger.error('Error getting BNPL options:', error);
      return [];
    }
  }

  /**
   * Create BNPL checkout session
   */
  async createBNPLCheckout(orderId, provider, plan) {
    try {
      // In production, initiate BNPL flow
      const bnplSession = {
        sessionId: 'bnpl_' + Math.random().toString(36).substr(2, 9),
        provider,
        plan,
        status: 'pending',
        redirectUrl: `${provider}.payment-url`,
      };

      return bnplSession;
    } catch (error) {
      logger.error('Error creating BNPL checkout:', error);
      throw error;
    }
  }

  // =========================================================================
  // PAYPAL
  // =========================================================================

  /**
   * Create PayPal payment
   */
  async createPayPalPayment(orderId, amount, currency = 'USD') {
    try {
      // In production, call PayPal API
      // const paypal = require('paypal-sdk');
      // const payment = await paypal.checkout.orders.create({...});

      const paypalOrder = {
        id: 'paypal_' + Math.random().toString(36).substr(2, 9),
        amount,
        currency,
        status: 'CREATED',
        approvalUrl: 'https://sandbox.paypal.com/cgi-bin/webscr...',
      };

      // Store transaction
      await this.db.paymentTransaction.create({
        data: {
          orderId,
          amount,
          currency,
          provider: 'paypal',
          status: 'pending',
          providerTxId: paypalOrder.id,
        },
      });

      return paypalOrder;
    } catch (error) {
      logger.error('Error creating PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Verify PayPal payment
   */
  async verifyPayPalPayment(transactionId) {
    try {
      // In production, call PayPal API to verify
      logger.info(`Verifying PayPal transaction: ${transactionId}`);

      return { status: 'verified' };
    } catch (error) {
      logger.error('Error verifying PayPal payment:', error);
      throw error;
    }
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Get payment summary for order
   */
  async getPaymentSummary(orderId) {
    try {
      const order = await this.db.order.findUnique({
        where: { id: orderId },
        include: { transaction: true },
      });

      if (!order) throw new Error('Order not found');

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        transaction: order.transaction || null,
      };
    } catch (error) {
      logger.error('Error getting payment summary:', error);
      throw error;
    }
  }

  /**
   * Get supported payment methods by country/chain
   */
  getSupportedMethods(country, chain = null) {
    const methods = {
      US: ['credit_card', 'bank_account', 'paypal', 'bnpl', 'usdc', 'usdt'],
      EU: ['credit_card', 'bank_account', 'paypal', 'bnpl', 'usdc'],
      ASIA: ['credit_card', 'paypal', 'usdc'],
      DEFAULT: ['credit_card', 'paypal', 'usdc'],
    };

    return methods[country] || methods.DEFAULT;
  }

  /**
   * Currency conversion
   */
  async convertCurrency(fromCurrency, toCurrency, amount) {
    try {
      // In production, call exchange rate API
      const rates = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        ETH: 0.0005, // Mock rate
        BTC: 0.000024, // Mock rate
        USDC: 1,
        USDT: 1,
      };

      const converted = (amount * rates[toCurrency]) / rates[fromCurrency];

      return converted;
    } catch (error) {
      logger.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Hash bank account for security
   */
  hashBankAccount(account) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(account).digest('hex');
  }
}

module.exports = AlternativePaymentsService;
