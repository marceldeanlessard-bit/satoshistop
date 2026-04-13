const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth.verifyToken, (req, res) => {
  res.json({ reputation: { score: req.user.reputation || 0, reviews: 12, level: 'trusted' } });
});

module.exports = router;
