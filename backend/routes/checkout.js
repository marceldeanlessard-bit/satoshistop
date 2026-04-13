const express = require('express');
const crypto = require('crypto');
const { get, all, run } = require('../db');
const alternativePayments = require('../services/alternativePaymentsServiceSQLite');

const router = express.Router();

// Get checkout session/cart summary
router.post('/session', async (req, res, next) => {
  try {
    const { userId, items, couponCode, shippingMethod } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid checkout data' });
    }

    // Calculate totals
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = await get(`SELECT * FROM products WHERE id = ?`, [item.id]);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.id} not found` });
      }

      if (product.inventory < item.quantity) {
        return res.status(400).json({ error: `Insufficient inventory for ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      itemDetails.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }

    // Apply coupon if provided
    let discount = 0;
    const validCoupons = {
      'SAVE10': 0.1,
      'SAVE20': 0.2,
      'CRYPTO50': 0.5,
      'WELCOME': 0.05
    };

    if (couponCode && validCoupons[couponCode]) {
      discount = Math.round(subtotal * validCoupons[couponCode] * 10000) / 10000;
    }

    const shippingCost = shippingMethod === 'express' ? 0.0005 : shippingMethod === 'standard' ? 0.0002 : 0;
    const total = Math.round((subtotal - discount + shippingCost) * 10000) / 10000;

    const sessionId = crypto.randomBytes(16).toString('hex');

    res.json({
      sessionId,
      items: itemDetails,
      subtotal: Math.round(subtotal * 10000) / 10000,
      discount,
      shippingCost,
      total,
      couponApplied: couponCode && validCoupons[couponCode] ? couponCode : null
    });
  } catch (err) {
    next(err);
  }
});

// Process payment and create orders
router.post('/checkout', async (req, res, next) => {
  try {
    const { userId, items, paymentMethod, shippingAddress, couponCode } = req.body;

    if (!userId || !items || items.length === 0 || !paymentMethod || !shippingAddress) {
      return res.status(400).json({ error: 'Missing required checkout fields' });
    }

    const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate and create orders
    const orders = [];
    const now = new Date().toISOString();
    let totalRevenue = 0;

    for (const item of items) {
      const product = await get(`SELECT * FROM products WHERE id = ?`, [item.id]);

      if (!product) {
        return res.status(404).json({ error: `Product ${item.id} not found` });
      }

      if (product.inventory < item.quantity) {
        return res.status(400).json({ error: `Insufficient inventory for ${product.name}` });
      }

      // Create order
      const orderId = crypto.randomBytes(8).toString('hex');
      const total = Math.round(product.price * item.quantity * 10000) / 10000;

      await run(
        `INSERT INTO orders (id, userId, productId, quantity, total, status, shippingAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, userId, item.id, item.quantity, total, 'pending_payment', shippingAddress, now]
      );

      // Update inventory (reserve - rollback if payment fails)
      await run(`UPDATE products SET inventory = inventory - ? WHERE id = ?`, [item.quantity, item.id]);

      // Update seller stats
      if (product.sellerId) {
        const stats = await get(`SELECT * FROM seller_stats WHERE userId = ?`, [product.sellerId]);
        if (stats) {
          await run(
            `UPDATE seller_stats SET totalSales = totalSales + ?, totalRevenue = totalRevenue + ? WHERE userId = ?`,
            [item.quantity, total, product.sellerId]
          );
        }

        const sellerNotifId = crypto.randomBytes(8).toString('hex');
        await run(
          `INSERT INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`,
          [sellerNotifId, product.sellerId, `New order received for ${product.name} (${item.quantity} unit${item.quantity > 1 ? 's' : ''}). Payment pending.`, now]
        );
      }

      orders.push({
        id: orderId,
        productId: item.id,
        productName: product.name,
        quantity: item.quantity,
        total
      });

      totalRevenue += total;
    }

    // Create notification
    const notifId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`,
      [notifId, userId, `Order created! ${orders.length} item(s) for ${totalRevenue.toFixed(4)} sats. Complete payment to confirm.`, now]
    );

    // Initiate payment based on method
    let paymentDetails = null;
    const totalOrderAmount = totalRevenue;

    switch (paymentMethod) {
      case 'card':
        paymentDetails = await alternativePayments.createStripePaymentIntent(orders[0].id, totalOrderAmount * 100, 'usd'); // cents
        break;
      case 'paypal':
        paymentDetails = await alternativePayments.createPayPalPayment(orders[0].id, totalOrderAmount, 'USD');
        break;
      case 'usdc':
        paymentDetails = await alternativePayments.getStablecoinPaymentDetails(orders[0].id, 'ethereum', 'USDC');
        break;
      case 'bnpl':
        paymentDetails = await alternativePayments.getBNPLOptions(totalOrderAmount);
        break;
      default:
        return res.status(400).json({ error: `Unsupported payment method: ${paymentMethod}` });
    }

    res.json({
      success: true,
      orders,
      total: totalRevenue.toFixed(4),
      paymentMethod,
      paymentDetails,
      status: 'payment_initiated',
      mainOrderId: orders[0].id
    });
  } catch (err) {
    next(err);
  }
});

// Get order status
router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await get(
      `SELECT o.*, p.name as productName, p.imageUrl, u.name as buyerName FROM orders o LEFT JOIN products p ON o.productId = p.id LEFT JOIN users u ON o.userId = u.id WHERE o.id = ?`,
      [req.params.orderId]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// Confirm payment by method
router.post('/:orderId/confirm-payment', async (req, res, next) => {
  try {
    const { paymentMethod, transactionHash, paymentIntentId } = req.body;

    const order = await get(`SELECT * FROM orders WHERE id = ?`, [req.params.orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let success = false;
    switch (paymentMethod) {
      case 'card':
        if (paymentIntentId) {
          await alternativePayments.confirmStripePayment(req.params.orderId, paymentIntentId);
          success = true;
        }
        break;
      case 'paypal':
      case 'usdc':
        // Mock verify - in prod use blockchain/webhook
        await run(`UPDATE orders SET status = 'paid', paymentTxHash = ? WHERE id = ?`, [transactionHash || 'mock-tx', req.params.orderId]);
        success = true;
        break;
    }

    if (success) {
      const trackingNumber = ['FDX', 'UPS', 'DHL'][Math.floor(Math.random() * 3)] + crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 12);
      await run(`UPDATE orders SET status = 'processing', trackingNumber = ? WHERE id = ?`, [trackingNumber, req.params.orderId]);
    }

    res.json({
      success,
      status: success ? 'processing' : 'failed',
      trackingNumber: success ? trackingNumber : null,
      transactionHash: transactionHash || paymentIntentId
    });
  } catch (err) {
    next(err);
  }
});

// List cart items endpoint (for cartStore) - mock data
router.get('/cart', async (req, res, next) => {
  res.json({
    items: [
      {
        id: 'btc-1',
        name: 'Bitcoin Access Pass',
        price: 0.005,
        quantity: 1,
        image: '🎟️',
        seller: { username: 'Satoshi User', verified: true },
        shipping: 'Digital delivery'
      }
    ],
    summary: { subtotal: 0.005, shipping: 0, tax: 0, total: 0.005 }
  });
});

module.exports = router;
