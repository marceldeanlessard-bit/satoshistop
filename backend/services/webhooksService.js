/**
 * Webhooks Service
 * Sends events to external systems (integrations, analytics, etc)
 */

const crypto = require('crypto');
const logger = require('../middleware/logger');

class WebhooksService {
  constructor(db, cacheService) {
    this.db = db;
    this.cache = cacheService;
    this.registeredWebhooks = new Map();
    this.eventQueue = [];
  }

  /**
   * Types of events that can trigger webhooks
   */
  static EVENT_TYPES = {
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    ORDER_PAID: 'order:paid',
    ORDER_SHIPPED: 'order:shipped',
    ORDER_DELIVERED: 'order:delivered',
    ORDER_CANCELLED: 'order:cancelled',
    ORDER_REFUNDED: 'order:refunded',

    PAYMENT_RECEIVED: 'payment:received',
    PAYMENT_FAILED: 'payment:failed',

    PRODUCT_CREATED: 'product:created',
    PRODUCT_UPDATED: 'product:updated',
    PRODUCT_DELETED: 'product:deleted',
    PRODUCT_OUT_OF_STOCK: 'product:out_of_stock',

    AUCTION_CREATED: 'auction:created',
    AUCTION_BID_PLACED: 'auction:bid_placed',
    AUCTION_ENDED: 'auction:ended',

    USER_REGISTERED: 'user:registered',
    USER_VERIFIED: 'user:verified',

    DROP_LAUNCHED: 'drop:launched',
    DROP_SOLD_OUT: 'drop:sold_out',
  };

  // =========================================================================
  // WEBHOOK REGISTRATION (for app developers)
  // =========================================================================

  /**
   * Register webhook endpoint
   */
  async registerWebhook(userId, webhookData) {
    try {
      const { url, events, secret, isActive = true } = webhookData;

      if (!url || !events || events.length === 0) {
        throw new Error('URL and events are required');
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      // Generate webhook secret for signature verification
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      const webhook = await this.db.webhook?.create?.({
        data: {
          userId,
          url,
          events: JSON.stringify(events),
          secret: this.hashSecret(webhookSecret),
          isActive,
          lastTriggeredAt: null,
          failureCount: 0,
        },
      });

      logger.info(`Webhook registered for user ${userId}: ${url}`);

      // Return secret only on registration (can't be retrieved later)
      return {
        id: webhook?.id,
        url,
        events,
        secret: webhookSecret,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Error registering webhook:', error);
      throw error;
    }
  }

  /**
   * List webhooks for user
   */
  async listWebhooks(userId) {
    try {
      return await this.db.webhook?.findMany?.({
        where: { userId },
        select: {
          id: true,
          url: true,
          events: true,
          isActive: true,
          lastTriggeredAt: true,
          failureCount: true,
          createdAt: true,
        },
      });
    } catch (error) {
      logger.error('Error listing webhooks:', error);
      return [];
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(userId, webhookId, updates) {
    try {
      return await this.db.webhook?.updateMany?.({
        where: { id: webhookId, userId },
        data: updates,
      });
    } catch (error) {
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(userId, webhookId) {
    try {
      await this.db.webhook?.deleteMany?.({
        where: { id: webhookId, userId },
      });
      return true;
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }

  // =========================================================================
  // WEBHOOK TRIGGERING
  // =========================================================================

  /**
   * Trigger webhook event
   */
  async triggerEvent(eventType, data, metadata = {}) {
    try {
      // Queue event for async processing
      this.eventQueue.push({
        eventType,
        data,
        metadata,
        timestamp: new Date(),
        id: crypto.randomBytes(8).toString('hex'),
      });

      // Process queue (in production, use job queue like Bull/RabbitMQ)
      this.processEventQueue();
    } catch (error) {
      logger.error('Error triggering webhook event:', error);
    }
  }

  /**
   * Process queued events
   */
  async processEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();

      try {
        await this.deliverEvent(event);
      } catch (error) {
        logger.error('Error processing event:', error);
        // Requeue failed events
        if (event.retries < 3) {
          event.retries = (event.retries || 0) + 1;
          setTimeout(() => this.eventQueue.push(event), 5000 * event.retries);
        }
      }
    }
  }

  /**
   * Deliver event to all registered webhook endpoints
   */
  async deliverEvent(event) {
    try {
      // Get all webhooks that should receive this event
      const webhooks = await this.db.webhook?.findMany?.({
        where: {
          isActive: true,
          events: {
            contains: event.eventType,
          },
        },
      });

      if (!webhooks) return;

      // Send to each webhook
      for (const webhook of webhooks) {
        await this.sendWebhookRequest(webhook, event);
      }
    } catch (error) {
      logger.error('Error delivering event:', error);
    }
  }

  /**
   * Send actual HTTP request to webhook
   */
  async sendWebhookRequest(webhook, event) {
    try {
      const payload = {
        id: event.id,
        type: event.eventType,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata,
      };

      // Calculate signature
      const signature = this.calculateSignature(
        JSON.stringify(payload),
        webhook.secret
      );

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SatoshiStop-Signature': signature,
          'X-SatoshiStop-Event-ID': event.id,
          'X-SatoshiStop-Event-Type': event.eventType,
        },
        body: JSON.stringify(payload),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed with status ${response.status}`
        );
      }

      // Update webhook last triggered time
      await this.db.webhook?.update?.({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0,
        },
      });

      logger.info(
        `Webhook delivered: ${webhook.url} (event: ${event.eventType})`
      );
    } catch (error) {
      logger.error(`Error sending webhook to ${webhook.url}:`, error);

      // Increment failure count
      await this.db.webhook?.update?.({
        where: { id: webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      });

      // Disable webhook after 10 failures
      const webhook updated = await this.db.webhook?.findUnique?.({
        where: { id: webhook.id },
      });

      if (webhook.failureCount >= 10) {
        await this.db.webhook?.update?.({
          where: { id: webhook.id },
          data: { isActive: false },
        });

        logger.warn(`Webhook disabled due to repeated failures: ${webhook.url}`);
      }
    }
  }

  // =========================================================================
  // EVENT SHORTCUTS (for common events)
  // =========================================================================

  async orderCreated(order) {
    return this.triggerEvent(
      WebhooksService.EVENT_TYPES.ORDER_CREATED,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        userId: order.userId,
      },
      { marketplace: 'satoshistop' }
    );
  }

  async orderPaid(order) {
    return this.triggerEvent(
      WebhooksService.EVENT_TYPES.ORDER_PAID,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentTxHash: order.paymentTxHash,
        chain: order.chain,
      }
    );
  }

  async orderShipped(order, trackingData) {
    return this.triggerEvent(
      WebhooksService.EVENT_TYPES.ORDER_SHIPPED,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
      }
    );
  }

  async productCreated(product) {
    return this.triggerEvent(
      WebhooksService.EVENT_TYPES.PRODUCT_CREATED,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        sellerId: product.sellerId,
      }
    );
  }

  async auctionEnded(auction, winner) {
    return this.triggerEvent(
      WebhooksService.EVENT_TYPES.AUCTION_ENDED,
      {
        auctionId: auction.id,
        title: auction.title,
        finalBid: auction.currentBid,
        winnerId: winner?.id,
        winnerAddress: winner?.walletAddress,
      }
    );
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Calculate HMAC-SHA256 signature
   */
  calculateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for external verification)
   */
  verifySignature(payload, signature, secret) {
    const calculated = this.calculateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculated)
    );
  }

  /**
   * Hash secret for storage
   */
  hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId, limit = 50) {
    try {
      // In production, would store delivery attempts in database
      return [];
    } catch (error) {
      logger.error('Error getting delivery history:', error);
      return [];
    }
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId) {
    try {
      const webhook = await this.db.webhook?.findUnique?.({
        where: { id: webhookId },
      });

      if (!webhook) throw new Error('Webhook not found');

      const testEvent = {
        id: 'test_' + crypto.randomBytes(4).toString('hex'),
        type: 'test:ping',
        timestamp: new Date(),
        data: { message: 'Test webhook delivery' },
      };

      await this.sendWebhookRequest(webhook, testEvent);

      return { success: true };
    } catch (error) {
      logger.error('Error testing webhook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = WebhooksService;
