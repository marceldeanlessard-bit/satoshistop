/**
 * Caching service using Redis
 * Falls back to in-memory cache if Redis is unavailable
 */

const redis = require('redis');
const logger = require('../middleware/logger');

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.useRedis = !!process.env.REDIS_URL;

    if (this.useRedis) {
      this.initializeRedis();
    }
  }

  initializeRedis() {
    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL,
      });

      this.redisClient.on('error', (err) => {
        logger.warn('Redis error, falling back to memory cache:', err.message);
        this.useRedis = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis cache');
      });

      this.redisClient.connect();
    } catch (error) {
      logger.warn('Failed to initialize Redis, using memory cache:', error.message);
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (this.useRedis && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          logger.debug(`Cache hit: ${key}`);
          return JSON.parse(value);
        }
      } else {
        if (this.memoryCache.has(key)) {
          const cached = this.memoryCache.get(key);
          if (cached.expiresAt > Date.now()) {
            logger.debug(`Memory cache hit: ${key}`);
            return cached.value;
          } else {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      logger.error(`Cache get error for ${key}:`, error);
    }
    return null;
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 3600) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        logger.debug(`Cached (Redis): ${key}`);
      } else {
        this.memoryCache.set(key, {
          value,
          expiresAt: Date.now() + ttl * 1000,
        });
        logger.debug(`Cached (Memory): ${key}`);
      }
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.memoryCache.clear();
      }
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern) {
    try {
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        for (const [key] of this.memoryCache) {
          if (new RegExp(pattern).test(key)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
    }
  }
}

/**
 * Pagination Helper
 */
const paginate = (items, page = 1, limit = 20) => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: items.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

/**
 * Cache middleware factory
 */
const cacheMiddleware = (cacheService, keyPrefix, ttl = 3600) => {
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.path}:${JSON.stringify(req.query)}`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode === 200) {
        cacheService.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  CacheService,
  cacheService: new CacheService(),
  paginate,
  cacheMiddleware,
};
