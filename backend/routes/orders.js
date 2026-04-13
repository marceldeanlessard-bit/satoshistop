const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { all, get, run } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const orders = await all(
      'SELECT o.*, p.name AS productName FROM orders o LEFT JOIN products p ON o.productId = p.id WHERE o.userId = ? ORDER BY o.createdAt DESC',
      [req.user.id]
    );
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/seller', auth.verifyToken, async (req, res, next) => {
  try {
    const orders = await all(
      `SELECT o.*, p.name AS productName, p.sellerId, u.name AS buyerName, u.email AS buyerEmail
       FROM orders o
       LEFT JOIN products p ON o.productId = p.id
       LEFT JOIN users u ON o.userId = u.id
       WHERE p.sellerId = ?
       ORDER BY o.createdAt DESC`,
      [req.user.id]
    );
    res.json({ orders: orders || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth.verifyToken, async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const product = await get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.inventory < quantity) {
      return res.status(400).json({ error: 'Not enough inventory available' });
    }

    const total = Number((product.price * quantity).toFixed(6));
    const id = `order-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const createdAt = new Date().toISOString();

    await run(
      'INSERT INTO orders (id, userId, productId, quantity, total, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, productId, quantity, total, 'completed', createdAt]
    );

    await run('UPDATE products SET inventory = inventory - ? WHERE id = ?', [quantity, productId]);

    res.json({
      order: {
        id,
        userId: req.user.id,
        productId,
        productName: product.name,
        quantity,
        total,
        status: 'completed',
        createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', auth.verifyToken, async (req, res, next) => {
  try {
    const { status, trackingNumber = null } = req.body;
    const allowedStatuses = ['pending', 'processing', 'completed', 'shipped', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await get(
      `SELECT o.*, p.sellerId, p.name AS productName
       FROM orders o
       LEFT JOIN products p ON p.id = o.productId
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update orders for your own listings' });
    }

    const updatedAt = new Date().toISOString();
    await run(
      `UPDATE orders SET status = ?, trackingNumber = COALESCE(?, trackingNumber), updatedAt = ? WHERE id = ?`,
      [status, trackingNumber, updatedAt, req.params.id]
    );

    const notificationId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`,
      [notificationId, order.userId, `Order ${order.productName} is now ${status}${trackingNumber ? ` (${trackingNumber})` : ''}.`, updatedAt]
    );

    const updatedOrder = await get(
      `SELECT o.*, p.name AS productName, p.sellerId
       FROM orders o
       LEFT JOIN products p ON p.id = o.productId
       WHERE o.id = ?`,
      [req.params.id]
    );

    res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
