/**
 * Admin service for platform moderation and management
 */

const logger = require('../middleware/logger');

class AdminService {
  /**
   * Get platform statistics
   */
  async getPlatformStats(db) {
    try {
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
      const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
      const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
      const totalRevenue = await db.get('SELECT SUM(total) as total FROM orders WHERE status = "delivered"');
      const activeListings = await db.get('SELECT COUNT(*) as count FROM products WHERE isActive = 1');
      const verifiedSellers = await db.get('SELECT COUNT(DISTINCT sellerId) as count FROM products WHERE verifiedSeller = 1');

      return {
        totalUsers: totalUsers?.count || 0,
        totalProducts: totalProducts?.count || 0,
        totalOrders: totalOrders?.count || 0,
        totalRevenue: totalRevenue?.total || 0,
        activeListings: activeListings?.count || 0,
        verifiedSellers: verifiedSellers?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get platform stats:', error);
      throw error;
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(db, userId, reason, duration = 30) {
    try {
      const suspendUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      await db.run(
        'UPDATE users SET isSuspended = 1, suspendReason = ?, suspendUntil = ? WHERE id = ?',
        [reason, suspendUntil.toISOString(), userId]
      );

      logger.info(`User ${userId} suspended for: ${reason}`);
      return { success: true, suspendUntil };
    } catch (error) {
      logger.error('Failed to suspend user:', error);
      throw error;
    }
  }

  /**
   * Ban user account permanently
   */
  async banUser(db, userId, reason) {
    try {
      await db.run(
        'UPDATE users SET isBanned = 1, banReason = ?, bannedAt = ? WHERE id = ?',
        [reason, new Date().toISOString(), userId]
      );

      logger.info(`User ${userId} banned for: ${reason}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to ban user:', error);
      throw error;
    }
  }

  /**
   * Flag product for review
   */
  async flagProduct(db, productId, reason, severity = 'medium') {
    try {
      await db.run(
        `INSERT INTO product_flags (productId, reason, severity, flaggedAt)
         VALUES (?, ?, ?, ?)`,
        [productId, reason, severity, new Date().toISOString()]
      );

      logger.info(`Product ${productId} flagged: ${reason}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to flag product:', error);
      throw error;
    }
  }

  /**
   * Remove product
   */
  async removeProduct(db, productId, reason) {
    try {
      await db.run(
        'UPDATE products SET isActive = 0, removalReason = ?, removedAt = ? WHERE id = ?',
        [reason, new Date().toISOString(), productId]
      );

      logger.info(`Product ${productId} removed: ${reason}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove product:', error);
      throw error;
    }
  }

  /**
   * Get flagged products
   */
  async getFlaggedProducts(db, status = 'pending') {
    try {
      const flaggedProducts = await db.all(
        `SELECT pf.*, p.name, u.username FROM product_flags pf
         JOIN products p ON pf.productId = p.id
         JOIN users u ON p.sellerId = u.id
         WHERE pf.status = ? ORDER BY pf.flaggedAt DESC`,
        [status]
      );

      return flaggedProducts || [];
    } catch (error) {
      logger.error('Failed to get flagged products:', error);
      throw error;
    }
  }

  /**
   * Get user disputes
   */
  async getUserDisputes(db, status = 'open') {
    try {
      const disputes = await db.all(
        `SELECT d.*, o.orderNumber, u.username, o.total
         FROM disputes d
         JOIN orders o ON d.orderId = o.id
         JOIN users u ON d.reporterId = u.id
         WHERE d.status = ? ORDER BY d.createdAt DESC`,
        [status]
      );

      return disputes || [];
    } catch (error) {
      logger.error('Failed to get disputes:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(db, disputeId, resolution, refundAmount = 0) {
    try {
      const dispute = await db.get('SELECT * FROM disputes WHERE id = ?', [disputeId]);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      await db.run(
        `UPDATE disputes SET status = 'resolved', resolution = ?, resolutionTime = ?
         WHERE id = ?`,
        [resolution, new Date().toISOString(), disputeId]
      );

      // If refund needed, update order
      if (refundAmount > 0) {
        await db.run(
          'UPDATE orders SET status = "refunded", total = total - ? WHERE id = ?',
          [refundAmount, dispute.orderId]
        );
      }

      logger.info(`Dispute ${disputeId} resolved with refund: ${refundAmount}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to resolve dispute:', error);
      throw error;
    }
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(db) {
    try {
      // Detect multiple failed purchases
      const fraudulentBuyers = await db.all(
        `SELECT u.id, u.username, COUNT(o.id) as orderCount, 
                COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelledCount
         FROM users u
         JOIN orders o ON u.id = o.userId
         WHERE o.createdAt > datetime('now', '-7 days')
         GROUP BY u.id
         HAVING cancelledCount > 5 OR orderCount > 50`
      );

      // Detect price manipulation
      const priceManipulation = await db.all(
        `SELECT p.id, p.name, p.price,
                LAG(p.price) OVER (ORDER BY p.updatedAt) as prevPrice
         FROM products p
         WHERE p.updatedAt > datetime('now', '-1 day')
         AND ABS(p.price - prevPrice) > prevPrice * 0.5`
      );

      return {
        fraudulentBuyers: fraudulentBuyers || [],
        priceManipulation: priceManipulation || [],
      };
    } catch (error) {
      logger.error('Failed to get suspicious activities:', error);
      throw error;
    }
  }

  /**
   * Generate moderation report
   */
  async generateModerationReport(db, startDate, endDate) {
    try {
      const suspensions = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE suspendUntil BETWEEN ? AND ?',
        [startDate, endDate]
      );

      const bans = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE bannedAt BETWEEN ? AND ?',
        [startDate, endDate]
      );

      const flaggedProducts = await db.get(
        'SELECT COUNT(*) as count FROM product_flags WHERE flaggedAt BETWEEN ? AND ?',
        [startDate, endDate]
      );

      const removedProducts = await db.get(
        'SELECT COUNT(*) as count FROM products WHERE removedAt BETWEEN ? AND ?',
        [startDate, endDate]
      );

      const resolvedDisputes = await db.get(
        'SELECT COUNT(*) as count FROM disputes WHERE resolutionTime BETWEEN ? AND ?',
        [startDate, endDate]
      );

      return {
        period: { startDate, endDate },
        suspensions: suspensions?.count || 0,
        bans: bans?.count || 0,
        flaggedProducts: flaggedProducts?.count || 0,
        removedProducts: removedProducts?.count || 0,
        resolvedDisputes: resolvedDisputes?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();
