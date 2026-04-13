/**
 * AI Recommendations Engine
 * Provides personalized product recommendations using embeddings and collaborative filtering
 */

const logger = require('../middleware/logger');

class RecommendationEngine {
  constructor(db, cacheService) {
    this.db = db;
    this.cache = cacheService;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  // ========================================================================
  // PRODUCT EMBEDDINGS
  // ========================================================================

  /**
   * Generate embedding for a product using OpenAI or local model
   */
  async generateProductEmbedding(product) {
    try {
      // For now, create a simple feature-based embedding
      // In production, call OpenAI API: https://api.openai.com/v1/embeddings
      const embedding = this.createLocalEmbedding(product);

      // Store in database
      await this.db.productEmbedding.upsert({
        where: { productId: product.id },
        update: { embedding: JSON.stringify(embedding) },
        create: {
          productId: product.id,
          embedding: JSON.stringify(embedding),
        },
      });

      return embedding;
    } catch (error) {
      logger.error('Error generating product embedding:', error);
      return null;
    }
  }

  /**
   * Create local embedding based on product features
   */
  createLocalEmbedding(product) {
    // Simple feature-based embedding (128-dimensional for demo)
    const embedding = new Array(128).fill(0);

    // Category encoding (indices 0-15, based on category type)
    const categoryMap = {
      electronics: 1,
      collectibles: 2,
      crypto: 3,
      art: 4,
      nft: 5,
      gaming: 6,
      fashion: 7,
      other: 0,
    };

    const categoryValue =
      (categoryMap[product.category?.toLowerCase()] || 0) / 8;
    for (let i = 0; i < 16; i++) {
      embedding[i] = categoryValue + Math.random() * 0.1;
    }

    // Price normalization (indices 16-31)
    const normalizedPrice = Math.min(product.price / 10000, 1);
    for (let i = 16; i < 32; i++) {
      embedding[i] = normalizedPrice + Math.random() * 0.1;
    }

    // Rating normalization (indices 32-47)
    const normalizedRating = product.rating / 5;
    for (let i = 32; i < 48; i++) {
      embedding[i] = normalizedRating + Math.random() * 0.1;
    }

    // Popularity (indices 48-63)
    const normalizedPopularity = Math.min(product.viewCount / 10000, 1);
    for (let i = 48; i < 64; i++) {
      embedding[i] = normalizedPopularity + Math.random() * 0.1;
    }

    // Availability (indices 64-79)
    const itemsInStock = Math.min(product.stock / 1000, 1);
    for (let i = 64; i < 80; i++) {
      embedding[i] = itemsInStock + Math.random() * 0.1;
    }

    // Chain acceptance diversity (indices 80-95)
    const chainCount = [
      product.isBitcoinAccepted,
      product.isEthereumAccepted,
    ].filter(Boolean).length;
    for (let i = 80; i < 96; i++) {
      embedding[i] = chainCount / 2 + Math.random() * 0.1;
    }

    // Fill remaining with random noise
    for (let i = 96; i < 128; i++) {
      embedding[i] = Math.random() * 0.1;
    }

    return embedding;
  }

  // ========================================================================
  // PERSONALIZED RECOMMENDATIONS
  // ========================================================================

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const cacheKey = `recommendations:${userId}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get user preferences
      const userPrefs = await this.db.userPreference.findUnique({
        where: { userId },
      });

      // Analyze user behavior
      const purchaseHistory = await this.db.order.findMany({
        where: { userId },
        include: { items: { include: { product: true } } },
        take: 20,
      });

      const viewedProducts = await this.db.activityFeed.findMany({
        where: { userId, activityType: 'product_viewed' },
        take: 50,
      });

      const likedProducts = await this.db.like.findMany({
        where: { userId },
        include: { product: true },
        take: 20,
      });

      // Calculate user preference vector
      const userVector = this.createUserPreferenceVector(
        userPrefs,
        purchaseHistory,
        viewedProducts,
        likedProducts
      );

      // Get all products
      const allProducts = await this.db.product.findMany({
        where: { isActive: true },
        include: { seller: true },
      });

      // Calculate similarity scores
      const recommendations = allProducts
        .map((product) => {
          const embedding = this.parseEmbedding(product.embeddings);
          const similarity = this.calculateCosineSimilarity(
            userVector,
            embedding
          );

          return {
            productId: product.id,
            product,
            score: similarity,
            reason: this.getRecommendationReason(
              product,
              userPrefs,
              purchaseHistory
            ),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Store in database for tracking
      for (const rec of recommendations) {
        await this.db.recommendation.create({
          data: {
            forUserId: userId,
            productId: rec.productId,
            score: rec.score,
            reason: rec.reason,
          },
        });
      }

      // Cache results for 1 hour
      await this.cache.set(
        cacheKey,
        JSON.stringify(recommendations),
        3600
      );

      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending recommendations (popular across all users)
   */
  async getTrendingRecommendations(limit = 10) {
    try {
      const cacheKey = 'recommendations:trending';
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get trending products (by views and likes in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const trending = await this.db.product.findMany({
        where: {
          isActive: true,
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          _count: {
            select: {
              likes: true,
              reviews: true,
              orders: true,
            },
          },
        },
        orderBy: { viewCount: 'desc' },
        take: limit,
      });

      const trendingWithScores = trending.map((product) => ({
        productId: product.id,
        product,
        score: this.calculateTrendScore(product),
      }));

      // Cache for 6 hours
      await this.cache.set(
        cacheKey,
        JSON.stringify(trendingWithScores),
        21600
      );

      return trendingWithScores;
    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  /**
   * Collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      // Find similar users (similar purchase/view history)
      const userOrders = await this.db.order.findMany({
        where: { userId },
        include: { items: { select: { productId: true } } },
      });

      const userProductIds = new Set(
        userOrders.flatMap((o) => o.items.map((i) => i.productId))
      );

      // Find users who bought similar products
      const similarUsers = await this.db.order.findMany({
        where: {
          items: {
            some: {
              productId: { in: Array.from(userProductIds) },
            },
          },
          userId: { not: userId },
        },
        distinct: ['userId'],
        take: 10,
      });

      // Get products from similar users that current user hasn't seen
      const recommendations = [];

      for (const order of similarUsers) {
        const otherUserOrders = await this.db.order.findMany({
          where: { userId: order.userId },
          include: { items: { include: { product: true } } },
        });

        for (const o of otherUserOrders) {
          for (const item of o.items) {
            if (
              !userProductIds.has(item.productId) &&
              item.product.isActive
            ) {
              const existing = recommendations.find(
                (r) => r.productId === item.productId
              );
              if (existing) {
                existing.score += 1;
              } else {
                recommendations.push({
                  productId: item.productId,
                  product: item.product,
                  score: 1,
                  reason: 'collaborative_filtering',
                });
              }
            }
          }
        }
      }

      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  /**
   * Category-based recommendations
   */
  async getCategoryRecommendations(userId, limit = 10) {
    try {
      const userPrefs = await this.db.userPreference.findUnique({
        where: { userId },
      });

      const favoriteCategories = userPrefs?.favoriteCategories
        ? JSON.parse(userPrefs.favoriteCategories)
        : null;

      if (!favoriteCategories || favoriteCategories.length === 0) {
        return [];
      }

      const recommendations = await this.db.product.findMany({
        where: {
          isActive: true,
          category: { in: favoriteCategories },
        },
        orderBy: { rating: 'desc' },
        take: limit,
      });

      return recommendations.map((product) => ({
        productId: product.id,
        product,
        score: product.rating / 5,
        reason: 'category_match',
      }));
    } catch (error) {
      logger.error('Error in category recommendations:', error);
      return [];
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Create user preference vector from history
   */
  createUserPreferenceVector(userPrefs, purchases, views, likes) {
    const vector = new Array(128).fill(0);

    // Aggregate category preferences
    const categoryWeights = {};
    const allProducts = [
      ...purchases.flatMap((p) => p.items.map((i) => i.product)),
      ...likes.map((l) => l.product),
    ];

    allProducts.forEach((product) => {
      categoryWeights[product.category] =
        (categoryWeights[product.category] || 0) + 1;
    });

    // Normalize and encode
    const categories = Object.entries(categoryWeights);
    categories.forEach(([category, weight], index) => {
      vector[index % 32] +=
        weight / Math.max(...Object.values(categoryWeights));
    });

    // Price preferences
    const avgPrice =
      allProducts.reduce((sum, p) => sum + p.price, 0) /
      Math.max(allProducts.length, 1);
    const normalizedPrice = Math.min(avgPrice / 10000, 1);
    for (let i = 32; i < 64; i++) {
      vector[i] = normalizedPrice;
    }

    // Rating preferences
    const avgRating =
      allProducts.reduce((sum, p) => sum + p.rating, 0) /
      Math.max(allProducts.length, 1);
    for (let i = 64; i < 96; i++) {
      vector[i] = avgRating / 5;
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
  }

  /**
   * Parse embedding from database
   */
  parseEmbedding(embeddingStr) {
    try {
      if (!embeddingStr) return new Array(128).fill(0);
      return JSON.parse(embeddingStr);
    } catch {
      return new Array(128).fill(0);
    }
  }

  /**
   * Get human-readable reason for recommendation
   */
  getRecommendationReason(product, userPrefs, purchaseHistory) {
    if (userPrefs?.favoriteCategories?.includes(product.category)) {
      return 'category_match';
    }

    const priceRange = userPrefs
      ? {
          min: userPrefs.priceRangeMin || 0,
          max: userPrefs.priceRangeMax || 10000,
        }
      : null;
    if (priceRange && product.price >= priceRange.min && product.price <= priceRange.max) {
      return 'price_preference';
    }

    if (product.rating >= 4.5) {
      return 'top_rated';
    }

    if (product.viewCount > 1000) {
      return 'trending';
    }

    return 'personalized';
  }

  /**
   * Calculate trend score for products
   */
  calculateTrendScore(product) {
    const viewWeight = 0.4;
    const likeWeight = 0.3;
    const orderWeight = 0.3;

    const normalizedViews = Math.min(product.viewCount / 10000, 1);
    const normalizedLikes = Math.min(
      (product._count?.likes || 0) / 1000,
      1
    );
    const normalizedOrders = Math.min(
      (product._count?.orders || 0) / 100,
      1
    );

    return (
      normalizedViews * viewWeight +
      normalizedLikes * likeWeight +
      normalizedOrders * orderWeight
    );
  }
}

module.exports = RecommendationEngine;
