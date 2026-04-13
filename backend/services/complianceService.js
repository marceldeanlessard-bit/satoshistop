/**
 * KYC / AML Compliance Service
 * Handles verification, sanctions checks, and regulatory compliance
 */

const logger = require('../middleware/logger');

class ComplianceService {
  constructor(db, emailService) {
    this.db = db;
    this.email = emailService;
    this.sumsubApiKey = process.env.SUMSUB_API_KEY;
    this.chainalysisApiKey = process.env.CHAINALYSIS_API_KEY;
  }

  // ========================================================================
  // KYC VERIFICATION
  // ========================================================================

  /**
   * Initiate KYC verification
   */
  async initiateKYC(userId) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new Error('User not found');

      // Create KYC record
      const kycRecord = await this.db.complianceRecord.create({
        data: {
          userId,
          recordType: 'kyc',
          status: 'pending',
          provider: 'sumsub',
        },
      });

      // In production, would integrate with Sumsub API
      // For now, mock approval after verification
      logger.info(`KYC initiated for user ${userId}`);

      return {
        recordId: kycRecord.id,
        status: 'pending',
        message: 'KYC verification started. Please complete your verification.',
      };
    } catch (error) {
      logger.error('Error initiating KYC:', error);
      throw error;
    }
  }

  /**
   * Get KYC status for user
   */
  async getKYCStatus(userId) {
    try {
      const record = await this.db.complianceRecord.findFirst({
        where: {
          userId,
          recordType: 'kyc',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return { status: 'not_started' };
      }

      return {
        status: record.status,
        verifiedAt: record.verifiedAt,
        expiresAt: record.expiresAt,
        rejectionReason: record.rejectionReason,
      };
    } catch (error) {
      logger.error('Error getting KYC status:', error);
      throw error;
    }
  }

  /**
   * Approve KYC (admin)
   */
  async approveKYC(recordId, adminNotes) {
    try {
      const record = await this.db.complianceRecord.update({
        where: { id: recordId },
        data: {
          status: 'verified',
          verifiedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
            365 * 24 * 60 * 60 * 1000
          ), // 1 year expiry
          metadata: JSON.stringify({ adminNotes }),
        },
      });

      // Update user verification status
      await this.db.user.update({
        where: { id: record.userId },
        data: { isVerified: true },
      });

      // Send notification
      const user = await this.db.user.findUnique({
        where: { id: record.userId },
      });

      if (user?.email) {
        await this.email.sendVerificationEmail(user.email, {
          type: 'kyc_approved',
          email: user.email,
        });
      }

      logger.info(`KYC approved for user ${record.userId}`);

      return record;
    } catch (error) {
      logger.error('Error approving KYC:', error);
      throw error;
    }
  }

  /**
   * Reject KYC (admin)
   */
  async rejectKYC(recordId, reason) {
    try {
      const record = await this.db.complianceRecord.update({
        where: { id: recordId },
        data: {
          status: 'rejected',
          rejectionReason: reason,
        },
      });

      // Notify user
      const user = await this.db.user.findUnique({
        where: { id: record.userId },
      });

      if (user?.email) {
        await this.email.sendVerificationEmail(user.email, {
          type: 'kyc_rejected',
          email: user.email,
          reason,
        });
      }

      logger.warn(`KYC rejected for user ${record.userId}: ${reason}`);

      return record;
    } catch (error) {
      logger.error('Error rejecting KYC:', error);
      throw error;
    }
  }

  // ========================================================================
  // AML CHECKS
  // ========================================================================

  /**
   * Perform AML screening
   */
  async performAMLCheck(userId) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: { sellerProfile: true },
      });

      if (!user) throw new Error('User not found');

      // Check against sanctions lists
      const isSanctioned = await this.checkSanctionsList(user);

      if (isSanctioned) {
        // Create AML record marking as suspicious
        await this.db.complianceRecord.create({
          data: {
            userId,
            recordType: 'aml',
            status: 'rejected',
            rejectionReason:
              'User appears on sanctions list',
            metadata: JSON.stringify({
              checkType: 'sanctions_list',
              timestamp: new Date(),
            }),
          },
        });

        // Suspend user account
        await this.db.user.update({
          where: { id: userId },
          data: { isActive: false },
        });

        logger.warn(
          `User ${userId} flagged for sanctions list match`
        );

        return {
          status: 'failed',
          reason: 'User flagged for compliance review',
        };
      }

      // Create passing AML record
      await this.db.complianceRecord.create({
        data: {
          userId,
          recordType: 'aml',
          status: 'verified',
          verifiedAt: new Date(),
        },
      });

      return { status: 'passed' };
    } catch (error) {
      logger.error('Error performing AML check:', error);
      throw error;
    }
  }

  /**
   * Check against sanctions lists (placeholder)
   */
  async checkSanctionsList(user) {
    try {
      // In production, integrate with:
      // - OFAC SDN list
      // - EU Consolidated List
      // - Chainalysis sanctions API
      // - PEPs (Politically Exposed Persons)

      const sanctionedNames = [
        'putin',
        'kimjongun',
        'criminal',
      ]; // Mock list

      const fullName =
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();

      for (const name of sanctionedNames) {
        if (fullName.includes(name)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking sanctions list:', error);
      return false;
    }
  }

  /**
   * Monitor transactions for suspicious activity
   */
  async monitorTransaction(orderId, amount, userId) {
    try {
      // Check for red flags
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      const redFlags = [];

      // Check transaction velocity
      const recentOrders = await this.db.order.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentOrders > 50) {
        redFlags.push('high_transaction_velocity');
      }

      // Check for unusual amounts
      const avgOrderValue = await this.db.order.aggregate({
        where: { userId },
        _avg: { total: true },
      });

      if (
        avgOrderValue._avg?.total &&
        amount > avgOrderValue._avg.total * 5
      ) {
        redFlags.push('unusual_amount');
      }

      // Check for multiple failed payments
      const failedPayments = await this.db.order.count({
        where: {
          userId,
          paymentStatus: 'failed',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (failedPayments > 3) {
        redFlags.push('multiple_failed_payments');
      }

      if (redFlags.length > 0) {
        logger.warn(`Suspicious activity detected for user ${userId}:`, redFlags);

        // Create suspicious activity record
        await this.db.complianceRecord.create({
          data: {
            userId,
            recordType: 'aml',
            status: 'investigating',
            metadata: JSON.stringify({
              orderId,
              redFlags,
              amount,
            }),
          },
        });

        return {
          flagged: true,
          flags: redFlags,
          requiresReview: true,
        };
      }

      return { flagged: false };
    } catch (error) {
      logger.error('Error monitoring transaction:', error);
      throw error;
    }
  }

  // ========================================================================
  // ENTITY SCREENING
  // ========================================================================

  /**
   * Screen wallet address against Chainalysis API
   */
  async screenWalletAddress(userId, walletAddress) {
    try {
      // In production, integrate with Chainalysis API
      // Check if address is associated with:
      // - Money laundering
      // - Ransomware
      // - Darknet markets
      // - High-risk jurisdictions

      const isHighRisk = await this.checkWalletRisk(walletAddress);

      if (isHighRisk) {
        await this.db.complianceRecord.create({
          data: {
            userId,
            recordType: 'aml',
            status: 'rejected',
            rejectionReason: 'High-risk wallet address',
            metadata: JSON.stringify({ walletAddress }),
          },
        });

        return { approved: false, reason: 'High-risk wallet' };
      }

      return { approved: true };
    } catch (error) {
      logger.error('Error screening wallet address:', error);
      throw error;
    }
  }

  /**
   * Check wallet risk (placeholder)
   */
  async checkWalletRisk(walletAddress) {
    // In production, call Chainalysis or similar service
    // For demo, return false
    return false;
  }

  // ========================================================================
  // COMPLIANCE REPORTING
  // ========================================================================

  /**
   * Generate compliance report (for audits)
   */
  async generateComplianceReport(startDate, endDate) {
    try {
      const records = await this.db.complianceRecord.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const report = {
        generatedAt: new Date(),
        period: { startDate, endDate },
        totalRecords: records.length,
        byStatus: {
          verified: records.filter((r) => r.status === 'verified').length,
          pending: records.filter((r) => r.status === 'pending').length,
          rejected: records.filter((r) => r.status === 'rejected').length,
          investigating: records.filter((r) => r.status === 'investigating').length,
        },
        byType: {
          kyc: records.filter((r) => r.recordType === 'kyc').length,
          aml: records.filter((r) => r.recordType === 'aml').length,
          sanctions_check: records.filter((r) => r.recordType === 'sanctions_check').length,
        },
      };

      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Get compliance overview for dashboard
   */
  async getComplianceOverview() {
    try {
      const [totalUsers, verifiedUsers, flaggedUsers, pendingReviews] =
        await Promise.all([
          this.db.user.count(),
          this.db.user.count({ where: { isVerified: true } }),
          this.db.complianceRecord.count({
            where: { status: 'rejected' },
          }),
          this.db.complianceRecord.count({
            where: { status: 'investigating' },
          }),
        ]);

      return {
        totalUsers,
        verifiedUsers,
        verificationRate: (
          (verifiedUsers / totalUsers) *
          100
        ).toFixed(2),
        flaggedUsers,
        pendingReviews,
        complianceScore:
          ((verifiedUsers - flaggedUsers) / totalUsers) * 100,
      };
    } catch (error) {
      logger.error('Error getting compliance overview:', error);
      throw error;
    }
  }
}

module.exports = ComplianceService;
