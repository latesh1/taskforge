const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications (Fetch all notifications for logged-in user)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await db('notifications')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(100);

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read (Mark a single notification as read)
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notif = await db('notifications').where({ id, user_id: req.user.id }).first();
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db('notifications').where({ id }).update({ is_read: true });
    
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all (Mark all notifications as read)
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await db('notifications').where({ user_id: req.user.id }).update({ is_read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
