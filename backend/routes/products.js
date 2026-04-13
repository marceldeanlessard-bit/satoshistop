const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { get, all, run } = require('../db');

const router = express.Router();

// Get featured/trending products (must be before /:id route)
router.get('/trending', async (req, res, next) => {
  try {
    const trending = await all(
      `SELECT * FROM products ORDER BY rating DESC, reviewCount DESC, createdAt DESC LIMIT 6`
    );
    res.json({ products: trending || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/seller/dashboard/me', auth.verifyToken, async (req, res, next) => {
  try {
    const seller = await get(
      `SELECT u.id, u.name, u.email, u.wallet, u.reputation, ss.totalSales, ss.totalRevenue, ss.averageRating, ss.reviewCount, ss.verifiedSeller,
              sp.storeName, sp.tagline, sp.bio, sp.shippingPolicy, sp.supportPolicy, sp.accentColor, sp.heroEmoji, sp.heroImageUrl
       FROM users u
       LEFT JOIN seller_stats ss ON ss.userId = u.id
       LEFT JOIN seller_profiles sp ON sp.userId = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    const products = await all(
      `SELECT p.*, COALESCE(SUM(o.quantity), 0) AS unitsSold
       FROM products p
       LEFT JOIN orders o ON o.productId = p.id
       WHERE p.sellerId = ?
       GROUP BY p.id
       ORDER BY p.createdAt DESC`,
      [req.user.id]
    );

    const orders = await all(
      `SELECT o.*, p.name AS productName, p.sellerId, u.name AS buyerName
       FROM orders o
       LEFT JOIN products p ON p.id = o.productId
       LEFT JOIN users u ON u.id = o.userId
       WHERE p.sellerId = ?
       ORDER BY o.createdAt DESC
       LIMIT 8`,
      [req.user.id]
    );

    res.json({
      seller: seller || req.user,
      products: products || [],
      orders: orders || []
    });
  } catch (err) {
    next(err);
  }
});

router.put('/seller/dashboard/me', auth.verifyToken, async (req, res, next) => {
  try {
    const {
      storeName = req.user.name,
      tagline = '',
      bio = '',
      shippingPolicy = '',
      supportPolicy = '',
      accentColor = '#ff9f1c',
      heroEmoji = '🛍️',
      heroImageUrl = ''
    } = req.body;

    const updatedAt = new Date().toISOString();
    await run(
      `INSERT INTO seller_profiles (userId, storeName, tagline, bio, shippingPolicy, supportPolicy, accentColor, heroEmoji, heroImageUrl, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         storeName = excluded.storeName,
         tagline = excluded.tagline,
         bio = excluded.bio,
         shippingPolicy = excluded.shippingPolicy,
         supportPolicy = excluded.supportPolicy,
         accentColor = excluded.accentColor,
         heroEmoji = excluded.heroEmoji,
         heroImageUrl = excluded.heroImageUrl,
         updatedAt = excluded.updatedAt`,
      [req.user.id, storeName, tagline, bio, shippingPolicy, supportPolicy, accentColor, heroEmoji, heroImageUrl, updatedAt]
    );

    const seller = await get(
      `SELECT u.id, u.name, u.email, u.wallet, u.reputation, ss.totalSales, ss.totalRevenue, ss.averageRating, ss.reviewCount, ss.verifiedSeller,
              sp.storeName, sp.tagline, sp.bio, sp.shippingPolicy, sp.supportPolicy, sp.accentColor, sp.heroEmoji, sp.heroImageUrl
       FROM users u
       LEFT JOIN seller_stats ss ON ss.userId = u.id
       LEFT JOIN seller_profiles sp ON sp.userId = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json({ seller });
  } catch (err) {
    next(err);
  }
});

// Get categories (must be before /:id route)
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await all(`SELECT * FROM product_categories ORDER BY name ASC`);
    res.json({ categories: categories || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth.verifyToken, async (req, res, next) => {
  try {
    const { name, description, price, inventory, category, imageUrl } = req.body;

    if (!name || !description || Number(price) <= 0 || Number(inventory) < 0) {
      return res.status(400).json({ error: 'Valid name, description, price, and inventory are required' });
    }

    const productId = `prod-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
    const createdAt = new Date().toISOString();

    await run(
      `INSERT INTO products (id, name, description, price, inventory, category, sellerId, imageUrl, rating, reviewCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        name.trim(),
        description.trim(),
        Number(price),
        Number(inventory),
        category || 'cat-1',
        req.user.id,
        imageUrl || '🛍️',
        5,
        0,
        createdAt
      ]
    );

    await run(
      `INSERT OR IGNORE INTO seller_stats (id, userId, totalSales, totalRevenue, averageRating, reviewCount, verifiedSeller, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`stats-${req.user.id}`, req.user.id, 0, 0, 5, 0, 0, createdAt]
    );

    const product = await get(
      `SELECT p.*, u.name AS sellerName, u.reputation
       FROM products p
       LEFT JOIN users u ON u.id = p.sellerId
       WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// Get all products with ratings, search, filter, and sort
router.get('/', async (req, res, next) => {
  try {
    const { category, search, seller, sortBy = 'name' } = req.query;
    let query = `SELECT p.*, u.name as sellerName, u.reputation FROM products p LEFT JOIN users u ON p.sellerId = u.id WHERE 1=1`;

    const params = [];

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (seller) {
      query += ` AND p.sellerId = ?`;
      params.push(seller);
    }

    if (sortBy === 'price-low') query += ` ORDER BY p.price ASC`;
    else if (sortBy === 'price-high') query += ` ORDER BY p.price DESC`;
    else if (sortBy === 'rating') query += ` ORDER BY p.rating DESC`;
    else if (sortBy === 'newest') query += ` ORDER BY p.createdAt DESC`;
    else if (sortBy === 'trending') query += ` ORDER BY p.rating DESC, p.reviewCount DESC`;
    else query += ` ORDER BY p.name ASC`;

    const products = await all(query, params);
    res.json({ products: products || [] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth.verifyToken, async (req, res, next) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    const {
      name = product.name,
      description = product.description,
      price = product.price,
      inventory = product.inventory,
      category = product.category,
      imageUrl = product.imageUrl
    } = req.body;

    await run(
      `UPDATE products
       SET name = ?, description = ?, price = ?, inventory = ?, category = ?, imageUrl = ?
       WHERE id = ?`,
      [name.trim(), description.trim(), Number(price), Number(inventory), category || 'cat-1', imageUrl || '🛍️', req.params.id]
    );

    const updatedProduct = await get(
      `SELECT p.*, u.name AS sellerName, u.reputation
       FROM products p
       LEFT JOIN users u ON u.id = p.sellerId
       WHERE p.id = ?`,
      [req.params.id]
    );

    res.json({ product: updatedProduct });
  } catch (err) {
    next(err);
  }
});

// Get product details with reviews
router.get('/:id', async (req, res, next) => {
  try {
    const product = await get(`SELECT p.*, u.name as sellerName, u.id as sellerId FROM products p LEFT JOIN users u ON p.sellerId = u.id WHERE p.id = ?`, [req.params.id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = await all(`SELECT r.*, u.name as userName FROM reviews r LEFT JOIN users u ON r.userId = u.id WHERE r.productId = ? ORDER BY r.createdAt DESC`, [req.params.id]);

    res.json({ product, reviews: reviews || [] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth.verifyToken, async (req, res, next) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }

    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Add product review
router.post('/:id/reviews', async (req, res, next) => {
  try {
    const { userId, rating, title, comment } = req.body;

    if (!userId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid review data' });
    }

    const reviewId = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    await run(
      `INSERT INTO reviews (id, productId, userId, rating, title, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reviewId, req.params.id, userId, Math.round(rating), title || '', comment || '', now]
    );

    // Update product rating
    const avgRating = await get(`SELECT AVG(rating) as avg FROM reviews WHERE productId = ?`, [req.params.id]);
    const reviewCount = await get(`SELECT COUNT(*) as count FROM reviews WHERE productId = ?`, [req.params.id]);

    if (avgRating && reviewCount) {
      await run(`UPDATE products SET rating = ?, reviewCount = ? WHERE id = ?`, [
        parseFloat(avgRating.avg).toFixed(1),
        reviewCount.count,
        req.params.id
      ]);
    }

    res.json({ success: true, reviewId });
  } catch (err) {
    next(err);
  }
});

// Get seller profile with products
router.get('/seller/:userId', async (req, res, next) => {
  try {
    const seller = await get(
      `SELECT u.*, ss.totalSales, ss.totalRevenue, ss.averageRating, ss.reviewCount, ss.verifiedSeller,
              sp.storeName, sp.tagline, sp.bio, sp.shippingPolicy, sp.supportPolicy, sp.accentColor, sp.heroEmoji, sp.heroImageUrl
       FROM users u
       LEFT JOIN seller_stats ss ON u.id = ss.userId
       LEFT JOIN seller_profiles sp ON u.id = sp.userId
       WHERE u.id = ?`,
      [req.params.userId]
    );

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const products = await all(
      `SELECT p.*, COALESCE(SUM(o.quantity), 0) AS unitsSold
       FROM products p
       LEFT JOIN orders o ON o.productId = p.id
       WHERE p.sellerId = ?
       GROUP BY p.id
       ORDER BY p.rating DESC, p.reviewCount DESC, p.createdAt DESC
       LIMIT 12`,
      [req.params.userId]
    );

    res.json({ seller, products: products || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
