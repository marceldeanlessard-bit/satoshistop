/**
 * Security middleware configuration - Production hardened
 * CSP, Redis rate limiting, strict CORS, JWT verification
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const csurf = require('csurf');
const { body, validationResult } = require('express-validator');

/**
 * Helmet security headers configuration - Production CSP hardened
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
'connect-src': ["'self'", 'ws://localhost:3000', 'wss://localhost:*', 'http://localhost:3000', 'https://api.coingecko.com', 'https://ipfs.infura.io', 'https://eth-mainnet.g.alchemy.com', 'https://satoshi-stop.com', 'https://*.satoshi-stop.com', 'https://*.alchemy.com', 'https://*.infura.io'],
      'frame-ancestors': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
'style-src': ["'self'"],
      'script-src': ["'self'"],
      'font-src': ["'self'", 'https:', 'data:'],
      'upgrade-insecure-requests': [],
    },
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  permissionsPolicy: {
    accelerometer: [],
    camera: [],
    geolocation: [],
    microphone: [],
    fullscreen: ["'self'"],
    payment: 'self',
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
});

/**
 * Redis rate limiting store (distributed production)
 */
let redisStore;
try {
  const redisClient = new Redis({
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  redisStore = new RedisStore({
    client: redisClient,
    prefix: 'ratelimit:',
    expiry: 3600,
  });
} catch (err) {
  console.warn('RedisStore init failed, using memory store:', err.message);
  redisStore = undefined;
}

/**
 * Rate limiting configurations - Redis backed
 */
const limiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    store: redisStore,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
  }),

  // Stricter limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    store: redisStore,
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // Stricter limit for registration
  register: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registrations per hour
    store: redisStore,
    message: 'Too many registration attempts, please try again after an hour.',
  }),

  // Payment/checkout rate limit
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 payment attempts per minute
    store: redisStore,
    message: 'Too many payment attempts, please try again later.',
  }),

  // Message rate limit
  messages: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 messages per minute
    store: redisStore,
    message: 'Too many messages, please try again later.',
  }),
};

/**
 * Input sanitization middleware - Enhanced for scripts/events
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (value) => {
    if (typeof value === 'string') {
      // Strip dangerous tags and attributes
      let clean = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\\w+\s*=/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/[<>\"']/g, (char) => {
          const map = {
            '<': '<',
            '>': '>',
            '\"': '"',
            "'": '&#39;',
          };
          return map[char] || char;
        })
        .trim();
      return clean;
    }
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach((key) => {
        value[key] = sanitize(value[key]);
      });
    }
    return value;
  };

  req.body = sanitize(req.body);
  next();
};

/**
 * CORS configuration - Strict origin validation
 */
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowed.some(allowedOrigin => allowedOrigin.trim() === origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

/**
 * JWT verification middleware
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * CSRF protection middleware
 */
const csrfMiddleware = csurf({ cookie: true });

/**
 * Input validation middleware using express-validator + sanitize
 */
const validateInput = [
  body('*').optional().trim().escape().isLength({ max: 5000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Composite security middleware application
 */
const cors = require('cors');

const applySecurity = (app) => {
  app.use(helmetConfig);
  app.use(cors(corsOptions));
  app.use(limiters.general);
  app.use(sanitizeInput);
  app.use(validateInput);
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      return csrfMiddleware(req, res, next);
    }
    next();
  });
};

module.exports = {
  helmetConfig,
  limiters,
  sanitizeInput,
  validateInput,
  corsOptions,
  csrfMiddleware,
  verifyJWT,
  applySecurity,
};

