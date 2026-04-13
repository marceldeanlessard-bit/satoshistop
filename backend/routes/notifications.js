const express = require('express');
const auth = require('../middleware/auth');
const { all } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const notifications = await all('SELECT id, message, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
