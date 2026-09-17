const Notification = require("../models/Notification");

const {
  createNotification,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../services/notificationService");

/**
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
    } = req.query;

    const parsedPage = Math.max(
      Number(page) || 1,
      1
    );

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {
      recipient: req.user._id,
    };

    if (type) {
      filter.type = String(type).trim();
    }

    if (isRead !== undefined) {
      if (
        isRead === "true" ||
        isRead === "false"
      ) {
        filter.isRead = isRead === "true";
      } else {
        return res.status(400).json({
          success: false,
          message: "isRead must be true or false",
          code: "INVALID_IS_READ_FILTER",
        });
      }
    }

    const skip =
      (parsedPage - 1) * parsedLimit;

    const [items, total, unreadCount] =
      await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),

        Notification.countDocuments(filter),

        getUnreadNotificationCount(
          req.user._id
        ),
      ]);

    return res.status(200).json({
      success: true,
      message:
        "Notifications fetched successfully",
      data: {
        items,
        unreadCount,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(
            total / parsedLimit
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      code: "NOTIFICATION_FETCH_FAILED",
    });
  }
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount =
      await getUnreadNotificationCount(
        req.user._id
      );

    return res.status(200).json({
      success: true,
      message:
        "Unread notification count fetched successfully",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error(
      "Get unread notification count error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch unread notification count",
      code: "UNREAD_NOTIFICATION_COUNT_FAILED",
    });
  }
};

/**
 * POST /api/notifications/test
 *
 * Real authenticated notification test.
 *
 * This runs inside the actual Express + Socket.IO
 * server process, so Socket.IO can emit to the
 * currently logged-in user's room.
 */
const testNotification = async (req, res) => {
  try {
    console.log("===== TEST NOTIFICATION START =====");

    console.log("REQ.USER:", req.user);

    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      console.error(
        "TEST NOTIFICATION: authenticated user ID missing"
      );

      return res.status(401).json({
        success: false,
        message: "Authenticated user ID is missing",
        code: "USER_ID_MISSING",
      });
    }

    console.log(
      "Creating notification for:",
      String(userId)
    );

    const notification = await createNotification({
      recipient: userId,
      type: "general",
      title: "Notification System Test",
      message:
        "This is a real-time notification test from Force Strike CRM.",
      metadata: {
        source: "authenticated-test-endpoint",
      },
      channels: ["in_app", "email"],
    });

    console.log(
      "CREATE NOTIFICATION RESULT:",
      notification
    );

    if (!notification) {
      console.error(
        "TEST NOTIFICATION: createNotification returned null"
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create test notification",
        code: "CREATE_NOTIFICATION_NULL",
      });
    }

    console.log(
      "===== TEST NOTIFICATION SUCCESS ====="
    );

    return res.status(201).json({
      success: true,
      message:
        "Test notification created successfully",
      data: notification,
    });
  } catch (error) {
    console.error(
      "===== TEST NOTIFICATION ERROR ====="
    );

    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create test notification",
      code: "TEST_NOTIFICATION_FAILED",
    });
  }
};
/**
 * GET /api/notifications/:id
 */
const getNotificationById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const notification =
      await Notification.findOne({
        _id: id,
        recipient: req.user._id,
      }).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
        code: "NOTIFICATION_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification fetched successfully",
      data: notification,
    });
  } catch (error) {
    console.error(
      "Get notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification",
      code: "NOTIFICATION_FETCH_FAILED",
    });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification =
      await markNotificationAsRead(
        id,
        req.user._id
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
        code: "NOTIFICATION_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark notification as read",
      code: "NOTIFICATION_READ_FAILED",
    });
  }
};

/**
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const updatedCount =
      await markAllNotificationsAsRead(
        req.user._id
      );

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
      data: {
        updatedCount,
      },
    });
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark all notifications as read",
      code: "NOTIFICATIONS_READ_ALL_FAILED",
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  testNotification,
  getNotificationById,
  markAsRead,
  markAllAsRead,
};