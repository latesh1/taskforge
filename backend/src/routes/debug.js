const express = require('express');
const router = express.Router();
const { getSentEmailsLog, clearSentEmailsLog } = require('../utils/mailer');

// GET /api/debug/emails (Fetch simulated outbox logs)
router.get('/emails', (req, res) => {
  res.json(getSentEmailsLog());
});

// POST /api/debug/emails/clear (Clear mock outbox log)
router.post('/emails/clear', (req, res) => {
  clearSentEmailsLog();
  res.json({ message: 'Virtual outbox logs cleared.' });
});

module.exports = router;
