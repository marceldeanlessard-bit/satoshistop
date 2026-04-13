const express = require('express');
const crypto = require('crypto');
const { get, all, run } = require('../db');

const router = express.Router();

// Get recently viewed products for user
router.get('/:userId', async (req, res, next) => {
  try {
    const views = await all(
      `SELECT DISTINCT p.* FROM products p INNER JOIN recent_views rv ON p.id = rv.productId WHERE rv.userId = ? ORDER BY rv.viewedAt DESC LIMIT 8`,
      [req.params.userId]
    );
    res.json({ products: views || [] });
  } catch (err) {
    next(err);
  }
});

// Track product view
router.post('/', async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: 'Missing userId or productId' });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    // Remove old view if exists
    await run(`DELETE FROM recent_views WHERE userId = ? AND productId = ?`, [userId, productId]);

    // Add new view
    await run(
      `INSERT INTO recent_views (id, userId, productId, viewedAt) VALUES (?, ?, ?, ?)`,
      [id, userId, productId, now]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
