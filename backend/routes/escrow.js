const express = require('express');
const auth = require('../middleware/auth');
const { all } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const active = await all('SELECT * FROM orders WHERE userId = ? AND status = ?', [req.user.id, 'completed']);
    res.json({ escrow: { active: active.length, pending: 0, totalValue: active.reduce((sum, order) => sum + order.total, 0) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
