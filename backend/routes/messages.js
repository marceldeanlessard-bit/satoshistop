const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { get, all, run } = require('../db');

const router = express.Router();

router.get('/', auth.verifyToken, async (req, res, next) => {
  try {
    const threads = await all(
      `SELECT mt.*,
              buyer.name AS buyerName,
              seller.name AS sellerName,
              p.name AS productName,
              (
                SELECT body
                FROM message_entries me
                WHERE me.threadId = mt.id
                ORDER BY me.createdAt DESC
                LIMIT 1
              ) AS lastMessage
       FROM message_threads mt
       LEFT JOIN users buyer ON buyer.id = mt.buyerId
       LEFT JOIN users seller ON seller.id = mt.sellerId
       LEFT JOIN products p ON p.id = mt.productId
       WHERE mt.buyerId = ? OR mt.sellerId = ?
       ORDER BY mt.updatedAt DESC`,
      [req.user.id, req.user.id]
    );

    res.json({ threads: threads || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/:threadId', auth.verifyToken, async (req, res, next) => {
  try {
    const thread = await get(
      `SELECT mt.*,
              buyer.name AS buyerName,
              seller.name AS sellerName,
              p.name AS productName
       FROM message_threads mt
       LEFT JOIN users buyer ON buyer.id = mt.buyerId
       LEFT JOIN users seller ON seller.id = mt.sellerId
       LEFT JOIN products p ON p.id = mt.productId
       WHERE mt.id = ?`,
      [req.params.threadId]
    );

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.buyerId !== req.user.id && thread.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await all(
      `SELECT me.*, u.name AS senderName
       FROM message_entries me
       LEFT JOIN users u ON u.id = me.senderId
       WHERE me.threadId = ?
       ORDER BY me.createdAt ASC`,
      [req.params.threadId]
    );

    res.json({ thread, messages: messages || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/thread', auth.verifyToken, async (req, res, next) => {
  try {
    const { sellerId, orderId = null, productId = null, subject = 'Marketplace support', body } = req.body;

    if (!sellerId || !body) {
      return res.status(400).json({ error: 'sellerId and body are required' });
    }

    let thread = await get(
      `SELECT * FROM message_threads
       WHERE buyerId = ? AND sellerId = ? AND COALESCE(orderId, '') = COALESCE(?, '') AND COALESCE(productId, '') = COALESCE(?, '')`,
      [req.user.id, sellerId, orderId, productId]
    );

    const now = new Date().toISOString();

    if (!thread) {
      const threadId = `thread-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
      await run(
        `INSERT INTO message_threads (id, buyerId, sellerId, orderId, productId, subject, status, updatedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [threadId, req.user.id, sellerId, orderId, productId, subject, 'open', now, now]
      );
      thread = await get('SELECT * FROM message_threads WHERE id = ?', [threadId]);
    }

    const messageId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO message_entries (id, threadId, senderId, senderRole, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [messageId, thread.id, req.user.id, 'buyer', body, now]
    );
    await run(`UPDATE message_threads SET updatedAt = ?, status = ? WHERE id = ?`, [now, 'open', thread.id]);

    const notificationId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`,
      [notificationId, sellerId, `New buyer message: ${subject}`, now]
    );

    res.status(201).json({ threadId: thread.id });
  } catch (err) {
    next(err);
  }
});

router.post('/:threadId', auth.verifyToken, async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const thread = await get(`SELECT * FROM message_threads WHERE id = ?`, [req.params.threadId]);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const isBuyer = thread.buyerId === req.user.id;
    const isSeller = thread.sellerId === req.user.id;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date().toISOString();
    const entryId = crypto.randomBytes(8).toString('hex');
    const senderRole = isSeller ? 'seller' : 'buyer';

    await run(
      `INSERT INTO message_entries (id, threadId, senderId, senderRole, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [entryId, thread.id, req.user.id, senderRole, body, now]
    );
    await run(`UPDATE message_threads SET updatedAt = ?, status = ? WHERE id = ?`, [now, 'open', thread.id]);

    const recipientId = isSeller ? thread.buyerId : thread.sellerId;
    const notificationId = crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO notifications (id, userId, message, createdAt) VALUES (?, ?, ?, ?)`,
      [notificationId, recipientId, `New ${senderRole} reply in "${thread.subject}"`, now]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
