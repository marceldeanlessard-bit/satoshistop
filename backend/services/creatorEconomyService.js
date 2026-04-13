/**
 * Creator Economy Service
 * Manages drops, auctions, earnings, and creator tools
 */

const logger = require('../middleware/logger');

class CreatorEconomyService {
  constructor(db, cacheService, realtimeService, emailService) {
    this.db = db;
    this.cache = cacheService;
    this.realtime = realtimeService;
    this.email = emailService;
  }

  // ========================================================================
  // CREATOR DROPS
  // ========================================================================

  /**
   * Create a new drop
   */
  async createDrop(creatorId, dropData) {
    try {
      const drop = await this.db.creatorDrop.create({
        data: {
          creatorId,
          name: dropData.name,
          description: dropData.description,
          image: dropData.image,
          startTime: dropData.startTime,
          endTime: dropData.endTime,
          price: dropData.price,
          maxQuantity: dropData.maxQuantity,
          specialOffers: JSON.stringify(dropData.specialOffers || {}),
        },
      });

      // Invalidate creator cache
      await this.cache.invalidatePattern(`creator:${creatorId}:*`);

      // Notify followers
      this.realtime.broadcastDropLaunched(drop.id, creatorId, drop);

      // Send email to creator
      await this.email.sendSellerNotificationEmail(creatorId, {
        type: 'drop_created',
        dropName: drop.name,
      });

      return drop;
    } catch (error) {
      logger.error('Error creating drop:', error);
      throw error;
    }
  }

  /**
   * Add product to drop
   */
  async addProductToDrop(dropId, productId) {
    try {
      const updated = await this.db.product.update({
        where: { id: productId },
        data: {
          dropId,
          isDropItem: true,
        },
      });

      const drop = await this.db.creatorDrop.findUnique({
        where: { id: dropId },
      });

      this.realtime.broadcastDropInventoryUpdate(
        dropId,
        drop.maxQuantity - drop.quantitySold
      );

      return updated;
    } catch (error) {
      logger.error('Error adding product to drop:', error);
      throw error;
    }
  }

  /**
   * Get drop details with analytics
   */
  async getDrop(dropId, includeAnalytics = false) {
    try {
      const drop = await this.db.creatorDrop.findUnique({
        where: { id: dropId },
        include: {
          products: {
            include: {
              _count: { select: { orders: true } },
            },
          },
          creator: {
            select: { username: true, avatar: true },
          },
        },
      });

      if (!drop) return null;

      if (includeAnalytics) {
        const orders = await this.db.order.count({
          where: {
            items: {
              some: { product: { dropId } },
            },
          },
        });

        const revenue = await this.db.order.aggregate({
          where: {
            items: {
              some: { product: { dropId } },
            },
          },
          _sum: { total: true },
        });

        drop.analytics = {
          totalOrders: orders,
          totalRevenue: revenue._sum?.total || 0,
          avgOrderValue: orders > 0 ? (revenue._sum?.total || 0) / orders : 0,
          conversionRate: drop.products.length
            ? (orders / drop.products.length).toFixed(4)
            : 0,
        };
      }

      return drop;
    } catch (error) {
      logger.error('Error getting drop details:', error);
      throw error;
    }
  }

  /**
   * Get active drops for marketplace
   */
  async getActiveDrops(limit = 20) {
    try {
      const cacheKey = 'drops:active';
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const now = new Date();
      const drops = await this.db.creatorDrop.findMany({
        where: {
          AND: [
            { startTime: { lte: now } },
            { endTime: { gte: now } },
            { status: 'live' },
          ],
        },
        include: {
          products: {
            select: { id: true, name: true, price: true, image: true },
            take: 3,
          },
          creator: {
            select: { username: true, avatar: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: limit,
      });

      await this.cache.set(cacheKey, JSON.stringify(drops), 300); // 5 min cache

      return drops;
    } catch (error) {
      logger.error('Error getting active drops:', error);
      return [];
    }
  }

  // ========================================================================
  // AUCTIONS
  // ========================================================================

  /**
   * Create auction listing
   */
  async createAuction(sellerId, auctionData) {
    try {
      const auction = await this.db.auctionListing.create({
        data: {
          sellerId,
          productId: auctionData.productId,
          title: auctionData.title,
          description: auctionData.description,
          startPrice: auctionData.startPrice,
          currentBid: auctionData.startPrice,
          endTime: auctionData.endTime,
          auctionType: auctionData.auctionType || 'english',
        },
      });

      // Mark product as auction item
      await this.db.product.update({
        where: { id: auctionData.productId },
        data: { isAuctionItem: true },
      });

      // Broadcast to marketplace
      this.realtime.broadcastTrendingProducts([
        {
          id: auction.id,
          name: auction.title,
          price: auction.startPrice,
          trend: 'new_auction',
        },
      ]);

      return auction;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  /**
   * Place bid on auction
   */
  async placeBid(auctionId, bidderId, bidAmount) {
    try {
      const auction = await this.db.auctionListing.findUnique({
        where: { id: auctionId },
      });

      if (!auction) throw new Error('Auction not found');
      if (auction.status === 'sold' || auction.status === 'cancelled') {
        throw new Error('Auction is not active');
      }
      if (new Date() > auction.endTime) throw new Error('Auction ended');
      if (bidAmount <= auction.currentBid) {
        throw new Error('Bid must be higher than current bid');
      }

      // Create bid record
      const bid = await this.db.auctionBid.create({
        data: {
          auctionId,
          bidderId,
          amount: bidAmount,
        },
      });

      // Update auction
      const updatedAuction = await this.db.auctionListing.update({
        where: { id: auctionId },
        data: {
          currentBid: bidAmount,
          highestBidderId: bidderId,
        },
      });

      // Broadcast to auction watchers
      this.realtime.broadcastNewBid(auctionId, {
        amount: bidAmount,
        bidderId,
        auctionEndTime: auction.endTime,
      });

      return bid;
    } catch (error) {
      logger.error('Error placing bid:', error);
      throw error;
    }
  }

  /**
   * End auction (called by scheduler)
   */
  async endAuction(auctionId) {
    try {
      const auction = await this.db.auctionListing.findUnique({
        where: { id: auctionId },
        include: { seller: true },
      });

      if (!auction || auction.status !== 'active') {
        return; // Already ended
      }

      // Update auction status
      const ended = await this.db.auctionListing.update({
        where: { id: auctionId },
        data: { status: auction.highestBidderId ? 'sold' : 'cancelled' },
      });

      if (auction.highestBidderId) {
        // Get highest bidder
        const winner = await this.db.user.findUnique({
          where: { id: auction.highestBidderId },
        });

        // Create order
        await this.db.order.create({
          data: {
            orderNumber: `AUC-${auctionId}-${Date.now()}`,
            userId: auction.highestBidderId,
            total: auction.currentBid,
            subtotal: auction.currentBid,
            paymentMethod: 'wallet', // Will be updated by buyer
            paymentStatus: 'pending',
            status: 'pending',
            shippingAddress: 'To be confirmed',
            shippingMethod: 'To be confirmed',
            items: {
              create: {
                productId: auction.productId,
                quantity: 1,
                price: auction.currentBid,
              },
            },
          },
        });

        // Notify highest bidder
        await this.email.sendOrderConfirmationEmail(
          auction.highestBidderId,
          {
            orderNumber: `AUC-${auctionId}`,
            items: [{ name: auction.title, price: auction.currentBid }],
            total: auction.currentBid,
          }
        );

        // Notify seller
        await this.email.sendSellerNotificationEmail(
          auction.sellerId,
          {
            type: 'auction_sold',
            itemName: auction.title,
            finalPrice: auction.currentBid,
            buyer: winner?.username,
          }
        );
      }

      // Broadcast
      this.realtime.broadcastAuctionEnded(auctionId, {
        finalAmount: auction.currentBid,
        winner: auction.highestBidderId,
      });

      return ended;
    } catch (error) {
      logger.error('Error ending auction:', error);
      throw error;
    }
  }

  // ========================================================================
  // EARNINGS & PAYOUTS
  // ========================================================================

  /**
   * Calculate creator earnings
   */
  async calculateEarnings(creatorId, period = 'month') {
    try {
      const dateFilter = this.getDateFilter(period);

      // Get sales
      const sales = await this.db.order.findMany({
        where: {
          items: {
            some: {
              product: { sellerId: creatorId },
            },
          },
          status: { in: ['delivered', 'paid'] },
          updatedAt: dateFilter,
        },
        include: { items: { where: { product: { sellerId: creatorId } } } },
      });

      const totalGross = sales.reduce((sum, order) => sum + order.total, 0);
      const platformFee = totalGross * 0.05; // 5% platform fee
      const net = totalGross - platformFee;

      return {
        period,
        grossSales: totalGross,
        platformFee,
        netEarnings: net,
        orderCount: sales.length,
      };
    } catch (error) {
      logger.error('Error calculating earnings:', error);
      throw error;
    }
  }

  /**
   * Schedule payout for creator
   */
  async schedulePayout(creatorId) {
    try {
      const earnings = await this.calculateEarnings(creatorId, 'month');

      if (earnings.netEarnings <= 0) {
        throw new Error('No earnings to payout');
      }

      const payout = await this.db.creatorEarnings.upsert({
        where: { creatorId },
        update: {
          pendingPayout: earnings.netEarnings,
          nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        },
        create: {
          creatorId,
          totalEarnings: earnings.netEarnings,
          pendingPayout: earnings.netEarnings,
          nextPayoutDate: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
          ),
        },
      });

      // Notify creator
      const creator = await this.db.user.findUnique({
        where: { id: creatorId },
      });

      if (creator?.email) {
        await this.email.sendSellerNotificationEmail(creatorId, {
          type: 'payout_scheduled',
          amount: earnings.netEarnings,
          payoutDate: payout.nextPayoutDate,
        });
      }

      return payout;
    } catch (error) {
      logger.error('Error scheduling payout:', error);
      throw error;
    }
  }

  /**
   * Get creator stats dashboard
   */
  async getCreatorStats(creatorId) {
    try {
      const cacheKey = `creator:${creatorId}:stats`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get all stats in parallel
      const [products, orders, earnings, followers] = await Promise.all([
        this.db.product.findMany({
          where: { sellerId: creatorId },
          _count: { select: { orders: true, reviews: true, likes: true } },
        }),
        this.db.order.count({
          where: {
            items: {
              some: { product: { sellerId: creatorId } },
            },
          },
        }),
        this.db.creatorEarnings.findUnique({
          where: { creatorId },
        }),
        this.db.follow.count({ where: { followingId: creatorId } }),
      ]);

      const stats = {
        productsCount: products.length,
        totalOrders: orders,
        totalViews: products.reduce(
          (sum, p) => sum + (p.viewCount || 0),
          0
        ),
        totalLikes: products.reduce((sum, p) => sum + p._count.likes, 0),
        avgRating:
          products.reduce((sum, p) => sum + p.rating, 0) /
          Math.max(products.length, 1),
        followers,
        monthlyEarnings: earnings?.thisMonthEarnings || 0,
        pendingPayout: earnings?.pendingPayout || 0,
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(stats), 3600);

      return stats;
    } catch (error) {
      logger.error('Error getting creator stats:', error);
      throw error;
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get date filter for analytics
   */
  getDateFilter(period) {
    const now = new Date();

    switch (period) {
      case 'day':
        return {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        };
      case 'week':
        return {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
      case 'month':
        return {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
      case 'year':
        return {
          gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
      default:
        return { gte: new Date(0) };
    }
  }

  /**
   * Verify creator eligibility for features
   */
  async verifyCreatorEligibility(creatorId) {
    try {
      const creator = await this.db.user.findUnique({
        where: { id: creatorId },
        include: { sellerProfile: true },
      });

      return {
        isVerified: creator?.isVerified || false,
        isSeller: creator?.isSeller || false,
        hasStore: !!creator?.sellerProfile,
        minOrdersReached: true, // Would check actual order count
      };
    } catch (error) {
      logger.error('Error verifying creator eligibility:', error);
      return null;
    }
  }
}

module.exports = CreatorEconomyService;
