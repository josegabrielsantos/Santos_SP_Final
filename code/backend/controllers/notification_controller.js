import Notification from '../models/notification_model.js';

/**
 * GET /api/notifications
 * Get current user's notifications (paginated, newest first)
 */
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = { recipientId: req.user._id };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'displayName avatar')
      .populate('postId', 'title')
      .populate('organizationId', 'name slug');

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + notifications.length < total,
    });
  } catch (error) {
    console.log('Error in getNotifications:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false,
    });
    res.status(200).json({ count });
  } catch (error) {
    console.log('Error in getUnreadCount:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/notifications/mark-read
 * Mark specific notifications as read
 * Body: { notificationIds: string[] } or { all: true }
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationIds, all } = req.body;

    if (all) {
      await Notification.updateMany(
        { recipientId: req.user._id, isRead: false },
        { isRead: true }
      );
    } else if (notificationIds?.length) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipientId: req.user._id },
        { isRead: true }
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log('Error in markAsRead:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

const getNotificationSummary = async (req, res) => {
  try {
    const [unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({ recipientId: req.user._id, isRead: false }),
      Notification.find({ recipientId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('senderId', 'displayName avatar')
        .populate('postId', 'title')
        .populate('organizationId', 'name slug'),
    ]);
    res.status(200).json({ unreadCount, notifications });
  } catch (error) {
    console.log('Error in getNotificationSummary:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { getNotifications, getUnreadCount, markAsRead, getNotificationSummary };
