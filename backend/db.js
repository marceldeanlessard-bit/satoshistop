const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'satoshi-stop.db');
const db = new sqlite3.Database(dbPath);

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) {
      reject(err);
    } else {
      resolve(this);
    }
  });
});

const hasColumn = async (table, column) => {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
};

const init = async () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, wallet TEXT UNIQUE, reputation INTEGER, createdAt TEXT, passwordHash TEXT, passwordSalt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT, createdAt TEXT, expiresAt TEXT, FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (token TEXT PRIMARY KEY, userId TEXT, createdAt TEXT, expiresAt TEXT, revoked INTEGER DEFAULT 0, FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS login_challenges (wallet TEXT PRIMARY KEY, challenge TEXT, expiresAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS magic_links (token TEXT PRIMARY KEY, userId TEXT, email TEXT, createdAt TEXT, expiresAt TEXT, used INTEGER DEFAULT 0, FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, description TEXT, price REAL, inventory INTEGER, createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userId TEXT, productId TEXT, quantity INTEGER, total REAL, status TEXT, createdAt TEXT, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(productId) REFERENCES products(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, userId TEXT, message TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, userId TEXT, plan TEXT, status TEXT, renewsAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS nft (id TEXT PRIMARY KEY, name TEXT, ownerId TEXT, rarity TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS referrals (id TEXT PRIMARY KEY, userId TEXT, code TEXT, rewards INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS governance (id TEXT PRIMARY KEY, title TEXT, status TEXT, description TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, productId TEXT, userId TEXT, rating INTEGER, title TEXT, comment TEXT, createdAt TEXT, FOREIGN KEY(productId) REFERENCES products(id), FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY, userId TEXT, productId TEXT, createdAt TEXT, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(productId) REFERENCES products(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS product_categories (id TEXT PRIMARY KEY, name TEXT, slug TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS recent_views (id TEXT PRIMARY KEY, userId TEXT, productId TEXT, viewedAt TEXT, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(productId) REFERENCES products(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS seller_stats (id TEXT PRIMARY KEY, userId TEXT, totalSales INTEGER DEFAULT 0, totalRevenue REAL DEFAULT 0, averageRating REAL DEFAULT 5.0, reviewCount INTEGER DEFAULT 0, verifiedSeller INTEGER DEFAULT 0, updatedAt TEXT, FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS seller_profiles (userId TEXT PRIMARY KEY, storeName TEXT, tagline TEXT, bio TEXT, shippingPolicy TEXT, supportPolicy TEXT, accentColor TEXT, heroEmoji TEXT, heroImageUrl TEXT, updatedAt TEXT, FOREIGN KEY(userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS message_threads (id TEXT PRIMARY KEY, buyerId TEXT, sellerId TEXT, orderId TEXT, productId TEXT, subject TEXT, status TEXT, updatedAt TEXT, createdAt TEXT, FOREIGN KEY(buyerId) REFERENCES users(id), FOREIGN KEY(sellerId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS message_entries (id TEXT PRIMARY KEY, threadId TEXT, senderId TEXT, senderRole TEXT, body TEXT, createdAt TEXT, FOREIGN KEY(threadId) REFERENCES message_threads(id), FOREIGN KEY(senderId) REFERENCES users(id))`);
  });

  if (!(await hasColumn('products', 'sellerId'))) {
    await run('ALTER TABLE products ADD COLUMN sellerId TEXT');
  }

  if (!(await hasColumn('products', 'category'))) {
    await run('ALTER TABLE products ADD COLUMN category TEXT DEFAULT "general"');
  }

  if (!(await hasColumn('products', 'imageUrl'))) {
    await run('ALTER TABLE products ADD COLUMN imageUrl TEXT');
  }

  if (!(await hasColumn('products', 'rating'))) {
    await run('ALTER TABLE products ADD COLUMN rating REAL DEFAULT 5.0');
  }

  if (!(await hasColumn('products', 'reviewCount'))) {
    await run('ALTER TABLE products ADD COLUMN reviewCount INTEGER DEFAULT 0');
  }

  if (!(await hasColumn('orders', 'shippingAddress'))) {
    await run('ALTER TABLE orders ADD COLUMN shippingAddress TEXT');
  }

  if (!(await hasColumn('orders', 'trackingNumber'))) {
    await run('ALTER TABLE orders ADD COLUMN trackingNumber TEXT');
  }

  if (!(await hasColumn('orders', 'updatedAt'))) {
    await run('ALTER TABLE orders ADD COLUMN updatedAt TEXT');
  }

  if (!(await hasColumn('users', 'passwordHash'))) {
    await run('ALTER TABLE users ADD COLUMN passwordHash TEXT');
  }

  if (!(await hasColumn('users', 'passwordSalt'))) {
    await run('ALTER TABLE users ADD COLUMN passwordSalt TEXT');
  }

  if (!(await hasColumn('sessions', 'expiresAt'))) {
    await run('ALTER TABLE sessions ADD COLUMN expiresAt TEXT');
  }

  if (!(await hasColumn('magic_links', 'used'))) {
    await run('ALTER TABLE magic_links ADD COLUMN used INTEGER DEFAULT 0');
  }

  if (!(await hasColumn('seller_profiles', 'heroImageUrl'))) {
    await run('ALTER TABLE seller_profiles ADD COLUMN heroImageUrl TEXT');
  }

  const now = new Date().toISOString();

  // Create categories
  const categories = [
    { id: 'cat-1', name: 'Access Passes', slug: 'access-passes' },
    { id: 'cat-2', name: 'Digital Collectibles', slug: 'collectibles' },
    { id: 'cat-3', name: 'Creator Tools', slug: 'creator-tools' },
    { id: 'cat-4', name: 'Educational', slug: 'educational' }
  ];

  for (const cat of categories) {
    await run(
      `INSERT OR IGNORE INTO product_categories (id, name, slug, createdAt) VALUES (?, ?, ?, ?)`,
      [cat.id, cat.name, cat.slug, now]
    );
  }

  const products = [
    ['btc-1', 'Bitcoin Access Pass', 'Premium marketplace access for Bitcoin collectors.', 0.005, 12, 'cat-1', 'user-1', '🎟️', 4.8, 24],
    ['eth-1', 'Ethereum Launchpad', 'Early access to Ethereum creator drops.', 0.002, 18, 'cat-3', 'user-1', '🚀', 4.9, 31],
    ['nft-1', 'Satoshi Badge NFT', 'Limited edition platform badge.', 0.0015, 7, 'cat-2', 'user-1', '🏅', 5.0, 18]
  ];

  for (const item of products) {
    const [id, name, desc, price, inv, cat, seller, imgUrl, rating, reviews] = item;
    await run(
      `INSERT OR IGNORE INTO products (id, name, description, price, inventory, category, sellerId, imageUrl, rating, reviewCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, desc, price, inv, cat, seller, imgUrl, rating, reviews, now]
    );
  }

  await run(
    `INSERT OR IGNORE INTO users (id, name, email, wallet, reputation, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    ['user-1', 'Satoshi User', 'satoshi@example.com', '0xsatoshi000000000000000000000000000000', 98, now]
  );

  // Initialize seller stats for the default user
  await run(
    `INSERT OR IGNORE INTO seller_stats (id, userId, totalSales, totalRevenue, averageRating, reviewCount, verifiedSeller, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['stats-user-1', 'user-1', 73, 0.4215, 4.9, 73, 1, now]
  );
  await run(
    `INSERT OR IGNORE INTO seller_profiles (userId, storeName, tagline, bio, shippingPolicy, supportPolicy, accentColor, heroEmoji, heroImageUrl, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'user-1',
      'Satoshi Stop Atelier',
      'Premium access, rare drops, and creator-grade digital goods.',
      'A high-trust storefront focused on scarce crypto-native access passes, collectible drops, and tools for serious communities.',
      'Orders usually process within 24 hours. Digital goods are fulfilled immediately after payment confirmation.',
      'Questions and fulfillment issues are handled directly by the seller through marketplace notifications.',
      '#ff9f1c',
      '🛍️',
      '',
      now
    ]
  );

  await run(`INSERT OR IGNORE INTO referrals (id, userId, code, rewards) VALUES (?, ?, ?, ?)`, ['ref-1', 'user-1', 'SATOSHI20', 3]);
  await run(`INSERT OR IGNORE INTO subscriptions (id, userId, plan, status, renewsAt) VALUES (?, ?, ?, ?, ?)`, ['sub-1', 'user-1', 'Pro', 'active', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]);
  await run(`INSERT OR IGNORE INTO nft (id, name, ownerId, rarity, createdAt) VALUES (?, ?, ?, ?, ?)`, ['nft-001', 'Satoshi Badge', 'user-1', 'legendary', now]);
  await run(`INSERT OR IGNORE INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`, ['notif-1', 'user-1', 'Your BTC order has settled.', now]);
};

module.exports = { db, get, all, run, init };
