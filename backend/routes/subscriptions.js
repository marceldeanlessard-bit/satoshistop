const express = require('express');
const auth = require('../middleware/auth');
const { all } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const subscriptions = await all('SELECT * FROM subscriptions WHERE userId = ?', [req.user.id]);
    res.json({ subscriptions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
