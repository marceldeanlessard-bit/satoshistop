const express = require('express');
const { all } = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const orders = await all('SELECT * FROM orders');
    const products = await all('SELECT * FROM products');
    const volume24h = orders.reduce((sum, order) => sum + order.total, 0);
    res.json({ analytics: { visitorsToday: 1200 + orders.length * 12, volume24h: Number(volume24h.toFixed(6)), products: products.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
