const express = require('express');
const crypto = require('crypto');
const { get, all, run } = require('../db');

const router = express.Router();

// Get user wishlist
router.get('/:userId', async (req, res, next) => {
  try {
    const items = await all(
      `SELECT p.* FROM products p INNER JOIN wishlist w ON p.id = w.productId WHERE w.userId = ? ORDER BY w.createdAt DESC`,
      [req.params.userId]
    );
    res.json({ items: items || [] });
  } catch (err) {
    next(err);
  }
});

// Add to wishlist
router.post('/', async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: 'Missing userId or productId' });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    const existing = await get(`SELECT id FROM wishlist WHERE userId = ? AND productId = ?`, [userId, productId]);

    if (existing) {
      return res.json({ success: true, id: existing.id });
    }

    await run(
      `INSERT INTO wishlist (id, userId, productId, createdAt) VALUES (?, ?, ?, ?)`,
      [id, userId, productId, now]
    );

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

// Remove from wishlist
router.delete('/:userId/:productId', async (req, res, next) => {
  try {
    await run(`DELETE FROM wishlist WHERE userId = ? AND productId = ?`, [req.params.userId, req.params.productId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
