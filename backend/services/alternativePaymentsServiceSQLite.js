/**
 * Alternative Payments Service - SQLite Version
 * Adapted for existing backend/db.js SQLite setup
 */

const crypto = require('crypto');
const logger = require('../middleware/logger');
const { get, all, run } = require('../db');
const emailService = require('./emailService');

/**
 * SQLite table init helpers (call once)
 */
const initTables = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      userId TEXT,
      type TEXT,
      provider TEXT,
      lastFourDigits TEXT,
      isDefault INTEGER DEFAULT 0,
      metadata TEXT,
      createdAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      amount REAL,
      currency TEXT,
      provider TEXT,
      status TEXT DEFAULT 'pending',
      providerTxId TEXT,
      metadata TEXT,
      createdAt TEXT,
      completedAt TEXT,
      FOREIGN KEY(orderId) REFERENCES orders(id)
    )
  `);
};

class AlternativePaymentsService {
  constructor() {
    this.stripeKey = process.env.STRIPE_SECRET_KEY;
    this.paypalApiKey = process.env.PAYPAL_API_KEY;
  }

  async addPaymentMethod(userId, paymentData) {
    const { type, provider, lastFourDigits, metadata } = paymentData;
    if (!['credit_card', 'bank_account', 'wallet', 'paypal', 'bnpl'].includes(type)) {
      throw new Error('Invalid payment method type');
    }

    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    await run(
      `INSERT INTO payment_methods (id, userId, type, provider, lastFourDigits, metadata, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, type, provider, lastFourDigits, JSON.stringify(metadata), now]
    );

    return { id, type, lastFour: lastFourDigits, createdAt: now };
  }

  async getPaymentMethods(userId) {
    return await all(
      `SELECT id, type, provider, lastFourDigits, isDefault, createdAt FROM payment_methods WHERE userId = ?`,
      [userId]
    );
  }

  async createStripePaymentIntent(orderId, amount, currency = 'usd') {
    // Mock for demo - replace with real Stripe in production
    const clientSecret = 'pi_mock_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    const id = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO payment_transactions (id, orderId, amount, currency, provider, status, providerTxId, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, orderId, amount, currency, 'stripe', clientSecret, JSON.stringify({status: 'requires_payment_method'}), now]
    );

    return { clientSecret, amount, currency, status: 'requires_payment_method' };
  }

  async confirmStripePayment(orderId, paymentIntentId) {
    // Mock confirm
    const transaction = await get(
      `SELECT * FROM payment_transactions WHERE orderId = ? AND provider = 'stripe'`,
      [orderId]
    );

    if (transaction) {
      const now = new Date().toISOString();
      await run(
        `UPDATE payment_transactions SET status = 'completed', completedAt = ? WHERE id = ?`,
        [now, transaction.id]
      );
      await run(`UPDATE orders SET status = 'paid' WHERE id = ?`, [orderId]);
    }

    return { status: 'succeeded' };
  }

  async getStablecoinPaymentDetails(orderId, chain = 'ethereum', stablecoin = 'USDC') {
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) throw new Error('Order not found');

    return {
      orderId,
      amount: order.total,
      stablecoin,
      chain,
      tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      recipientAddress: process.env.PAYMENT_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b8D7De2079A8A62552',
      memo: `SatoshiStop Order #${orderId}`
    };
  }

  async createPayPalPayment(orderId, amount, currency = 'USD') {
    const paypalOrderId = 'pay_mock_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    const txId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO payment_transactions (id, orderId, amount, currency, provider, status, providerTxId, createdAt)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [txId, orderId, amount, currency, 'paypal', paypalOrderId, now]
    );

    return {
      id: paypalOrderId,
      amount,
      currency,
      status: 'CREATED',
      approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=' + paypalOrderId
    };
  }

  async getBNPLOptions(orderTotal) {
    return [
      {
        provider: 'klarna',
        plans: [
          { name: 'Pay in 4', installments: 4, monthlyPayment: (orderTotal / 4).toFixed(2), interest: 0 },
          { name: '6 months', installments: 6, monthlyPayment: ((orderTotal * 1.02) / 6).toFixed(2), interest: 0.02 }
        ]
      },
      {
        provider: 'affirm',
        plans: [
          { name: 'Monthly', installments: 3, monthlyPayment: (orderTotal / 3).toFixed(2), interest: 0 }
        ]
      }
    ];
  }

  async getPaymentSummary(orderId) {
    const order = await get(
      `SELECT o.*, pt.* FROM orders o 
       LEFT JOIN payment_transactions pt ON o.id = pt.orderId 
       WHERE o.id = ?`,
      [orderId]
    );
    return order || null;
  }
}

module.exports = new AlternativePaymentsService();
initTables().catch(console.error);

