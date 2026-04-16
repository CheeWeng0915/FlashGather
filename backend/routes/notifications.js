const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const requireDatabase = require('../middleware/requireDatabase');
const requireAuth = require('../middleware/auth');
const loadCurrentUser = require('../middleware/loadCurrentUser');

const router = express.Router();

router.use(requireDatabase);
router.use(requireAuth);
router.use(loadCurrentUser);

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const serializeNotification = (notificationDoc) => {
  if (typeof notificationDoc?.toJSON === 'function') {
    return notificationDoc.toJSON();
  }

  return {
    ...notificationDoc,
    id: String(notificationDoc._id)
  };
};

router.get('/unread-count', async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    return res.json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const limit = Math.min(toPositiveInteger(req.query.limit, 30), 100);
  const unreadOnly = String(req.query.unreadOnly || '').trim().toLowerCase() === 'true';
  const filter = { userId: req.user.id };

  if (unreadOnly) {
    filter.isRead = false;
  }

  try {
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json(notifications.map(serializeNotification));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user.id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return res.json({
      message: 'Notifications marked as read.',
      updatedCount: result.modifiedCount || 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.json(serializeNotification(notification));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
