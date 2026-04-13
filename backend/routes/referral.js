const express = require('express');
const auth = require('../middleware/auth');
const { get } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const referral = await get('SELECT * FROM referrals WHERE userId = ?', [req.user.id]);
    res.json({ referral: referral || { code: 'SATOSHI10', rewards: 0 } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
