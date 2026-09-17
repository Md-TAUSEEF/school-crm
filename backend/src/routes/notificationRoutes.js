const express = require("express");

const {
  getNotifications,
  getUnreadCount,
  testNotification,
  getNotificationById,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

/**
 * GET /api/notifications
 */
router.get(
  "/",
  getNotifications
);

/**
 * GET /api/notifications/unread-count
 */
router.get(
  "/unread-count",
  getUnreadCount
);

/**
 * POST /api/notifications/test
 *
 * Authenticated real-time notification test.
 *
 * IMPORTANT:
 * Keep this BEFORE /:id.
 */
router.post(
  "/test",
  testNotification
);

/**
 * PUT /api/notifications/read-all
 */
router.put(
  "/read-all",
  markAllAsRead
);

/**
 * GET /api/notifications/:id
 */
router.get(
  "/:id",
  getNotificationById
);

/**
 * PUT /api/notifications/:id/read
 */
router.put(
  "/:id/read",
  markAsRead
);

module.exports = router;