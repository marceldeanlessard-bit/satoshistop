const { get } = require('../db');
const logger = require('./logger');

/**
 * Middleware to verify JWT token and attach user to request
 */
const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
    const err = new Error('Authorization token required'); err.code = 'AUTH_TOKEN_REQUIRED'; err.statusCode = 401; throw err;
    }

    const token = header.replace('Bearer ', '').trim();
    const session = await get('SELECT * FROM sessions WHERE token = ?', [token]);
    
    if (!session) {
    const err = new Error('Invalid session token'); err.code = 'INVALID_TOKEN'; err.statusCode = 401; throw err;
    }

    if (new Date(session.expiresAt) < new Date()) {
    const err = new Error('Session expired'); err.code = 'SESSION_EXPIRED'; err.statusCode = 401; throw err;
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [session.userId]);
    if (!user) {
    const err = new Error('User not found for session'); err.code = 'USER_NOT_FOUND'; err.statusCode = 401; throw err;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional authentication - attaches user if valid token, otherwise continues
 */
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.replace('Bearer ', '').trim();
      const session = await get('SELECT * FROM sessions WHERE token = ?', [token]);
      
      if (session && new Date(session.expiresAt) > new Date()) {
        const user = await get('SELECT * FROM users WHERE id = ?', [session.userId]);
        if (user) {
          req.user = user;
          req.token = token;
        }
      }
    }
  } catch (err) {
    logger.warn('Optional auth check failed:', err.message);
  }
  next();
};

/**
 * Role-based access control middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
    const err = new Error('Authentication required'); err.code = 'AUTH_REQUIRED'; err.statusCode = 401; throw err;
    }

    const userRoles = req.user.roles ? req.user.roles.split(',') : ['user'];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
    const err = new Error(`Access denied. Required roles: ${roles.join(', ')}`); err.code = 'FORBIDDEN'; err.statusCode = 403; throw err;
    }

    next();
  };
};

/**
 * Seller-only access
 */
const requireSeller = (req, res, next) => {
  if (!req.user || !req.user.isSeller) {
    const err = new Error('Seller account required'); err.code = 'SELLER_REQUIRED'; err.statusCode = 403; throw err;
  }
  next();
};

/**
 * Admin-only access
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    const err = new Error('Admin access required'); err.code = 'ADMIN_REQUIRED'; err.statusCode = 403; throw err;
  }
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requireSeller,
  requireAdmin,
};
