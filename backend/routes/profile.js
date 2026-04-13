const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth.verifyToken, (req, res) => {
  res.json({ profile: req.user });
});

module.exports = router;
