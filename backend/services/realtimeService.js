/**
 * Real-Time WebSocket Service
 * Handles live updates for auctions, products, orders, and user activities
 */

const logger = require('../middleware/logger');

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.activeUsers = new Map(); // userId -> socketIds
    this.userRooms = new Map(); // userId -> Set of room names
    this.init();
  }

  init() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // User joins with authentication
      socket.on('authenticate', (userData) => {
        try {
          const { userId, userName } = userData;
          if (!userId) return;

          // Track user connections
          if (!this.activeUsers.has(userId)) {
            this.activeUsers.set(userId, new Set());
          }
          this.activeUsers.get(userId).add(socket.id);

          // Join user-specific room
          socket.join(`user:${userId}`);
          socket.userData = { userId, userName };

          logger.info(`User ${userId} authenticated on socket ${socket.id}`);
        } catch (error) {
          logger.error('Authentication error:', error);
        }
      });

      // Subscribe to real-time updates
      socket.on('subscribe', (data) => {
        const { channel, roomId } = data; // channel: "auction", "product", "orders", etc
        const roomName = `${channel}:${roomId}`;
        socket.join(roomName);

        if (!this.userRooms.has(socket.userData?.userId)) {
          this.userRooms.set(socket.userData.userId, new Set());
        }
        this.userRooms.get(socket.userData.userId).add(roomName);

        logger.debug(`Socket ${socket.id} subscribed to ${roomName}`);
      });

      // Unsubscribe
      socket.on('unsubscribe', (data) => {
        const { channel, roomId } = data;
        const roomName = `${channel}:${roomId}`;
        socket.leave(roomName);
        logger.debug(`Socket ${socket.id} unsubscribed from ${roomName}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userData?.userId) {
          const userId = socket.userData.userId;
          const sockets = this.activeUsers.get(userId);
          if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.activeUsers.delete(userId);
            }
          }
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  // ========================================================================
  // AUCTION UPDATES
  // ========================================================================

  /**
   * Broadcast new bid to all auction watchers
   */
  broadcastNewBid(auctionId, bid) {
    this.io.to(`auction:${auctionId}`).emit('auction_bid', {
      auctionId,
      currentBid: bid.amount,
      bidderId: bid.bidderId,
      bidTime: bid.bidTime,
      timeRemaining: this.calculateTimeRemaining(bid.auctionEndTime),
    });
  }

  /**
   * Broadcast auction ending soon notification
   */
  broadcastAuctionEnding(auctionId, secondsRemaining) {
    this.io.to(`auction:${auctionId}`).emit('auction_ending_soon', {
      auctionId,
      timeRemaining: secondsRemaining,
    });
  }

  /**
   * Broadcast auction ended
   */
  broadcastAuctionEnded(auctionId, winner) {
    this.io.to(`auction:${auctionId}`).emit('auction_ended', {
      auctionId,
      winner,
      finalAmount: winner.finalAmount,
    });
  }

  // ========================================================================
  // PRODUCT UPDATES
  // ========================================================================

  /**
   * Broadcast product price change
   */
  broadcastPriceUpdate(productId, newPrice, chain) {
    this.io.to(`product:${productId}`).emit('price_updated', {
      productId,
      newPrice,
      chain,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast stock update
   */
  broadcastStockUpdate(productId, newStock) {
    this.io
      .to(`product:${productId}`)
      .emit('stock_updated', { productId, newStock });
  }

  /**
   * Broadcast new review on product
   */
  broadcastNewReview(productId, review) {
    this.io.to(`product:${productId}`).emit('new_review', {
      productId,
      review: {
        rating: review.rating,
        comment: review.comment,
        author: review.authorName,
        avatar: review.authorAvatar,
      },
    });
  }

  /**
   * Broadcast new comment on product
   */
  broadcastNewComment(productId, comment) {
    this.io.to(`product:${productId}`).emit('new_comment', {
      productId,
      comment: {
        id: comment.id,
        content: comment.content,
        author: comment.userName,
        avatar: comment.userAvatar,
        timestamp: comment.createdAt,
      },
    });
  }

  // ========================================================================
  // ORDER UPDATES
  // ========================================================================

  /**
   * Broadcast order status change to relevant users
   */
  broadcastOrderStatusChange(orderId, userId, newStatus, details) {
    // Send to buyer
    this.io.to(`user:${userId}`).emit('order_status_updated', {
      orderId,
      status: newStatus,
      message: this.getStatusMessage(newStatus),
      details,
      timestamp: new Date(),
    });

    // Send to seller(s) if applicable
    if (details.sellerId) {
      this.io.to(`user:${details.sellerId}`).emit('seller_order_updated', {
        orderId,
        status: newStatus,
        buyerId: userId,
      });
    }
  }

  /**
   * Broadcast payment received notification
   */
  broadcastPaymentReceived(orderId, amount, chain) {
    this.io.to(`order:${orderId}`).emit('payment_received', {
      orderId,
      amount,
      chain,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast shipment tracking update
   */
  broadcastTrackingUpdate(orderId, trackingNumber, location, status) {
    this.io.to(`order:${orderId}`).emit('tracking_updated', {
      orderId,
      trackingNumber,
      location,
      status,
      timestamp: new Date(),
    });
  }

  // ========================================================================
  // MESSAGES & NOTIFICATIONS
  // ========================================================================

  /**
   * Send direct message notification
   */
  notifyNewMessage(userId, message) {
    this.io.to(`user:${userId}`).emit('new_message', {
      threadId: message.threadId,
      from: message.senderName,
      preview: message.content.substring(0, 50),
      timestamp: message.createdAt,
    });
  }

  /**
   * Broadcast activity feed updates
   */
  broadcastActivityFeed(userId, activity) {
    // Send to user's followers
    this.io.to(`followers:${userId}`).emit('user_activity', {
      userId,
      activity: {
        type: activity.activityType,
        title: activity.title,
        timestamp: activity.createdAt,
      },
    });
  }

  // ========================================================================
  // CREATOR DROPS & EVENTS
  // ========================================================================

  /**
   * Broadcast drop launch
   */
  broadcastDropLaunched(dropId, creatorId, drop) {
    this.io.emit('drop_launched', {
      dropId,
      creatorId,
      name: drop.name,
      price: drop.price,
      maxQuantity: drop.maxQuantity,
      startsAt: drop.startTime,
    });
  }

  /**
   * Broadcast drop inventory update
   */
  broadcastDropInventoryUpdate(dropId, remaining) {
    this.io.to(`drop:${dropId}`).emit('inventory_update', {
      dropId,
      remaining,
      percentageSold: ((1 - remaining / 100) * 100).toFixed(2),
    });
  }

  // ========================================================================
  // LIVESTREAM UPDATES
  // ========================================================================

  /**
   * Broadcast livestream started
   */
  broadcastLivestream Started(sessionId, creatorId, title) {
    this.io.emit('livestream_started', {
      sessionId,
      creatorId,
      title,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast viewer joined livestream
   */
  broadcastViewerJoined(sessionId, viewerCount) {
    this.io
      .to(`livestream:${sessionId}`)
      .emit('viewer_joined', { viewerCount });
  }

  /**
   * Broadcast featured product in livestream
   */
  broadcastFeaturedProduct(sessionId, productId, product) {
    this.io.to(`livestream:${sessionId}`).emit('featured_product', {
      productId,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  }

  // ========================================================================
  // MARKETPLACE EVENTS
  // ========================================================================

  /**
   * Broadcast trending products
   */
  broadcastTrendingProducts(products) {
    this.io.emit('trending_products', {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        views: p.viewCount,
        price: p.price,
        trend: p.trend,
      })),
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast platform statistics
   */
  broadcastPlatformStats(stats) {
    this.io.emit('platform_stats', {
      activeUsers: stats.activeUsers,
      activeLivestreams: stats.activeLivestreams,
      ongoingAuctions: stats.ongoingAuctions,
      totalGMV: stats.totalGMV,
    });
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  calculateTimeRemaining(endTime) {
    const diff = new Date(endTime) - new Date();
    return Math.max(0, Math.floor(diff / 1000));
  }

  getStatusMessage(status) {
    const messages = {
      pending: 'Order placed - awaiting payment',
      paid: 'Payment received - preparing shipment',
      shipped: 'Order shipped - tracking available',
      delivered: 'Order delivered',
      cancelled: 'Order cancelled',
      refunded: 'Order refunded',
    };
    return messages[status] || 'Order updated';
  }

  /**
   * Get real-time marketplace metrics
   */
  getMetrics() {
    return {
      connectedUsers: this.activeUsers.size,
      activeConnections: this.io.sockets.sockets.size,
      rooms: this.io.sockets.adapter.rooms.size,
    };
  }

  /**
   * Broadcast to specific user
   */
  toUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all authenticated users
   */
  toAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = RealtimeService;
