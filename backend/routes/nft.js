const express = require('express');
const auth = require('../middleware/auth');
const { all } = require('../db');
const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const nft = await all('SELECT * FROM nft WHERE ownerId = ?', [req.user.id]);
    res.json({ nft });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
