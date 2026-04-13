/**
 * Admin routes for platform moderation and analytics
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const adminService = require('../services/adminService');
const db = require('../db');

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 */
router.get('/stats', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await adminService.getPlatformStats(db);
  res.json(stats);
}));

/**
 * @swagger
 * /api/admin/users/{userId}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               duration:
 *                 type: integer
 */
router.post('/users/:userId/suspend', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason, duration = 30 } = req.body;

  if (!reason) {
    throw new Error('Reason is required');
  }

  const result = await adminService.suspendUser(db, userId, reason, duration);
  res.json(result);
}));

/**
 * @swagger
 * /api/admin/users/{userId}/ban:
 *   post:
 *     tags: [Admin]
 *     summary: Ban a user permanently
 *     security:
 *       - bearerAuth: []
 */
router.post('/users/:userId/ban', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new Error('Reason is required');
  }

  const result = await adminService.banUser(db, userId, reason);
  res.json(result);
}));

/**
 * @swagger
 * /api/admin/products/{productId}/flag:
 *   post:
 *     tags: [Admin]
 *     summary: Flag a product for review
 *     security:
 *       - bearerAuth: []
 */
router.post('/products/:productId/flag', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { reason, severity = 'medium' } = req.body;

  if (!reason) {
    throw new Error('Reason is required');
  }

  const result = await adminService.flagProduct(db, productId, reason, severity);
  res.json(result);
}));

/**
 * @swagger
 * /api/admin/products/{productId}/remove:
 *   post:
 *     tags: [Admin]
 *     summary: Remove a product
 *     security:
 *       - bearerAuth: []
 */
router.post('/products/:productId/remove', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new Error('Reason is required');
  }

  const result = await adminService.removeProduct(db, productId, reason);
  res.json(result);
}));

/**
 * @swagger
 * /api/admin/flagged-products:
 *   get:
 *     tags: [Admin]
 *     summary: Get flagged products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 */
router.get('/flagged-products', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const flaggedProducts = await adminService.getFlaggedProducts(db, status);
  res.json({ flaggedProducts });
}));

/**
 * @swagger
 * /api/admin/disputes:
 *   get:
 *     tags: [Admin]
 *     summary: Get user disputes
 *     security:
 *       - bearerAuth: []
 */
router.get('/disputes', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'open' } = req.query;
  const disputes = await adminService.getUserDisputes(db, status);
  res.json({ disputes });
}));

/**
 * @swagger
 * /api/admin/disputes/{disputeId}/resolve:
 *   post:
 *     tags: [Admin]
 *     summary: Resolve a dispute
 *     security:
 *       - bearerAuth: []
 */
router.post('/disputes/:disputeId/resolve', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { disputeId } = req.params;
  const { resolution, refundAmount = 0 } = req.body;

  if (!resolution) {
    throw new Error('Resolution is required');
  }

  const result = await adminService.resolveDispute(db, disputeId, resolution, refundAmount);
  res.json(result);
}));

/**
 * @swagger
 * /api/admin/suspicious-activities:
 *   get:
 *     tags: [Admin]
 *     summary: Get suspicious activities
 *     security:
 *       - bearerAuth: []
 */
router.get('/suspicious-activities', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const activities = await adminService.getSuspiciousActivities(db);
  res.json(activities);
}));

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: Generate moderation report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *       - in: query
 *         name: endDate
 *         required: true
 */
router.get('/reports', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  const report = await adminService.generateModerationReport(db, startDate, endDate);
  res.json(report);
}));

module.exports = router;
