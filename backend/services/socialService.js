/**
 * Social Features Service
 * Handles follows, likes, comments, creator profiles, and community building
 */

const logger = require('../middleware/logger');

class SocialService {
  constructor(db, cacheService, realtimeService) {
    this.db = db;
    this.cache = cacheService;
    this.realtime = realtimeService;
  }

  // =========================================================================
  // FOLLOWS & FOLLOWERS
  // =========================================================================

  /**
   * Follow a user
   */
  async followUser(followerId, followingId) {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Create follow relationship
      const follow = await this.db.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // Update follower counts
      const followingUser = await this.db.user.update({
        where: { id: followingId },
        data: { followerCount: { increment: 1 } },
      });

      await this.db.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });

      // Invalidate cache
      await this.cache.invalidatePattern(`user:${followingId}:*`);
      await this.cache.invalidatePattern(`user:${followerId}:*`);

      // Broadcast via realtime
      this.realtime.toUser(followingId, 'new_follower', {
        followerId,
        newFollowerCount: followingUser.followerCount + 1,
      });

      return follow;
    } catch (error) {
      logger.error('Error following user:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId, followingId) {
    try {
      await this.db.follow.deleteMany({
        where: {
          followerId,
          followingId,
        },
      });

      // Update follower counts
      await this.db.user.update({
        where: { id: followingId },
        data: { followerCount: { decrement: 1 } },
      });

      await this.db.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      });

      // Invalidate cache
      await this.cache.invalidatePattern(`user:${followingId}:*`);
      await this.cache.invalidatePattern(`user:${followerId}:*`);

      return true;
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      throw error;
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId, limit = 20, offset = 0) {
    try {
      const cacheKey = `followers:${userId}:${offset}:${limit}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const followers = await this.db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              isSeller: true,
              isVerified: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const result = followers.map((f) => f.follower);

      await this.cache.set(cacheKey, JSON.stringify(result), 3600);

      return result;
    } catch (error) {
      logger.error('Error getting followers:', error);
      return [];
    }
  }

  /**
   * Get user's following
   */
  async getFollowing(userId, limit = 20, offset = 0) {
    try {
      const following = await this.db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              isSeller: true,
            },
          },
        },
        skip: offset,
        take: limit,
      });

      return following.map((f) => f.following);
    } catch (error) {
      logger.error('Error getting following:', error);
      return [];
    }
  }

  /**
   * Check if user follows another
   */
  async isFollowing(followerId, followingId) {
    try {
      const follow = await this.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      return !!follow;
    } catch (error) {
      logger.error('Error checking follow status:', error);
      return false;
    }
  }

  // =========================================================================
  // LIKES
  // =========================================================================

  /**
   * Like a product
   */
  async likeProduct(userId, productId) {
    try {
      const like = await this.db.like.create({
        data: {
          userId,
          productId,
        },
      });

      // Add to user's wishlist for convenience
      // (optional - could also just be a separate like feature)

      return like;
    } catch (error) {
      if (error.code === 'P2002') {
        // Already liked
        return null;
      }
      logger.error('Error liking product:', error);
      throw error;
    }
  }

  /**
   * Unlike a product
   */
  async unlikeProduct(userId, productId) {
    try {
      await this.db.like.deleteMany({
        where: {
          userId,
          productId,
        },
      });

      return true;
    } catch (error) {
      logger.error('Error unliking product:', error);
      throw error;
    }
  }

  /**
   * Get product likes count
   */
  async getProductLikesCount(productId) {
    try {
      const count = await this.db.like.count({
        where: { productId },
      });

      return count;
    } catch (error) {
      logger.error('Error getting likes count:', error);
      return 0;
    }
  }

  /**
   * Get users who liked product
   */
  async getProductLikers(productId, limit = 20) {
    try {
      const likers = await this.db.like.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return likers.map((l) => l.user);
    } catch (error) {
      logger.error('Error getting product likers:', error);
      return [];
    }
  }

  // =========================================================================
  // COMMENTS
  // =========================================================================

  /**
   * Add comment to product
   */
  async addComment(userId, productId, content) {
    try {
      const comment = await this.db.comment.create({
        data: {
          userId,
          productId,
          content,
        },
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Broadcast comment
      this.realtime.broadcastNewComment(productId, {
        id: comment.id,
        content: comment.content,
        userName: comment.user.username,
        userAvatar: comment.user.avatar,
        createdAt: comment.createdAt,
      });

      return comment;
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get product comments
   */
  async getProductComments(productId, limit = 50, offset = 0) {
    try {
      const comments = await this.db.comment.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return comments;
    } catch (error) {
      logger.error('Error getting comments:', error);
      return [];
    }
  }

  /**
   * Like a comment
   */
  async likeComment(userId, commentId) {
    try {
      const comment = await this.db.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { increment: 1 },
        },
      });

      return comment;
    } catch (error) {
      logger.error('Error liking comment:', error);
      throw error;
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(userId, commentId) {
    try {
      const comment = await this.db.comment.findUnique({
        where: { id: commentId },
      });

      if (comment?.userId !== userId) {
        throw new Error('Not authorized to delete this comment');
      }

      await this.db.comment.delete({
        where: { id: commentId },
      });

      return true;
    } catch (error) {
      logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  // =========================================================================
  // CREATOR PROFILES
  // =========================================================================

  /**
   * Get creator profile
   */
  async getCreatorProfile(userId) {
    try {
      const cacheKey = `creator:profile:${userId}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: {
          sellerProfile: true,
          verificationBadges: true,
          _count: {
            select: {
              products: true,
              followers: true,
              orders: true,
            },
          },
        },
      });

      if (!user || !user.isSeller) return null;

      // Get recent products
      const recentProducts = await this.db.product.findMany({
        where: { sellerId: userId, isActive: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });

      const profile = {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
        },
        store: user.sellerProfile,
        stats: {
          productCount: user._count.products,
          followerCount: user._count.followers,
          orderCount: user._count.orders,
          rating: user.reputation,
        },
        badges: user.verificationBadges,
        recentProducts,
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(profile), 3600);

      return profile;
    } catch (error) {
      logger.error('Error getting creator profile:', error);
      return null;
    }
  }

  /**
   * Get creator feed (activities)
   */
  async getCreatorFeed(userId, limit = 30) {
    try {
      const activities = await this.db.activityFeed.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return activities;
    } catch (error) {
      logger.error('Error getting creator feed:', error);
      return [];
    }
  }

  /**
   * Get follower feed (activity from followed creators)
   */
  async getFollowerFeed(userId, limit = 30) {
    try {
      // Get all followed users
      const following = await this.db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      const followingIds = following.map((f) => f.followingId);

      // Get their activities
      const feed = await this.db.activityFeed.findMany({
        where: {
          userId: { in: followingIds },
        },
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return feed;
    } catch (error) {
      logger.error('Error getting follower feed:', error);
      return [];
    }
  }

  /**
   * Create activity for user
   */
  async createActivity(userId, activityType, title, description) {
    try {
      const activity = await this.db.activityFeed.create({
        data: {
          userId,
          activityType,
          title,
          description,
        },
      });

      // Broadcast to followers
      this.realtime.broadcastActivityFeed(userId, activity);

      return activity;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  // =========================================================================
  // SOCIAL DISCOVERY
  // =========================================================================

  /**
   * Get trending creators
   */
  async getTrendingCreators(limit = 10) {
    try {
      const cacheKey = 'social:trending_creators';
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const trending = await this.db.user.findMany({
        where: {
          isSeller: true,
          isVerified: true,
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
          followerCount: true,
          reputation: true,
        },
        orderBy: { followerCount: 'desc' },
        take: limit,
      });

      await this.cache.set(cacheKey, JSON.stringify(trending), 3600);

      return trending;
    } catch (error) {
      logger.error('Error getting trending creators:', error);
      return [];
    }
  }

  /**
   * Get recommended creators for user
   */
  async getRecommendedCreators(userId, limit = 10) {
    try {
      // Get creators in categories user has liked
      const userLikes = await this.db.like.findMany({
        where: { userId },
        include: { product: { select: { category: true, sellerId: true } } },
        take: 20,
      });

      const categories = [
        ...new Set(userLikes.map((l) => l.product.category)),
      ];
      const alreadyFollowing = new Set(
        (
          await this.db.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      );

      // Find creators in same categories
      const creators = await this.db.user.findMany({
        where: {
          isSeller: true,
          products: {
            some: { category: { in: categories } },
          },
          id: { notIn: Array.from(alreadyFollowing) },
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          followerCount: true,
        },
        take: limit,
      });

      return creators;
    } catch (error) {
      logger.error('Error getting recommended creators:', error);
      return [];
    }
  }
}

module.exports = SocialService;
