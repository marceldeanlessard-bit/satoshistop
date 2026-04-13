const express = require('express');
const { all } = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const proposals = await all('SELECT id, title, status, description FROM governance ORDER BY createdAt DESC');
    res.json({ governance: proposals });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
