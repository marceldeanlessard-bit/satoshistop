const express = require('express');
const { generateAssistantReply } = require('../services/aiAssistantService');

const router = express.Router();

router.post('/shopper-assistant', async (req, res, next) => {
  try {
    const message = `${req.body?.message || ''}`.trim();

    if (!message) {
      return res.status(400).json({
        status: 'error',
        code: 'MESSAGE_REQUIRED',
        message: 'A message is required to use the shopping assistant.',
      });
    }

    const assistantReply = await generateAssistantReply(message);
    res.json(assistantReply);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
