const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('passport');
const morgan = require('morgan');

// Load environment variables from .env
dotenv.config();

const db = require('./db');
const logger = require('./middleware/logger');
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().required(),
  EMAIL_HOST: Joi.string().allow('').optional(),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  REDIS_URL: Joi.string().allow('').optional(),
}).unknown();

const { error, value } = envSchema.validate(process.env);
if (error) {
  console.error('Environment validation failed:', error.details[0].message);
  logger?.error('Environment validation failed:', error.details[0].message);
  process.exit(1);
}
logger.info('Environment validated successfully');

const { applySecurity, limiters, verifyToken } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { asyncHandler } = require('./middleware/errorHandler');
const { verifyToken: authVerifyToken, optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the local database
db.init().catch((error) => {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
});

// Apply composite security
applySecurity(app);

// Logging after helmet
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: { write: (message) => logger.http(message.trim()) } }));

// Passport initialization
app.use(passport.initialize());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes - keep specific limiters and auth
app.use('/api/auth', limiters.auth, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', limiters.payment, require('./routes/orders'));
app.use('/api/profile', verifyToken, require('./routes/profile'));
app.use('/api/reputation', require('./routes/reputation'));
app.use('/api/escrow', require('./routes/escrow'));
app.use('/api/subscriptions', verifyToken, require('./routes/subscriptions'));
app.use('/api/nft', require('./routes/nft'));
app.use('/api/analytics', optionalAuth, require('./routes/analytics'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/notifications', verifyToken, require('./routes/notifications'));
app.use('/api/governance', verifyToken, require('./routes/governance'));
app.use('/api/wishlist', verifyToken, require('./routes/wishlist'));
app.use('/api/recently-viewed', require('./routes/recently-viewed'));
app.use('/api/checkout', limiters.payment, require('./routes/checkout'));
app.use('/api/messages', limiters.messages, verifyToken, require('./routes/messages'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'API endpoint not found',
    path: req.path,
  });
});

// Global error handling middleware (MUST be last)
app.use(errorHandler);

// Process error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Satoshi Stop backend running on port ${PORT} 🚀`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
