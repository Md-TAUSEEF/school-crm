const Notification = require("../models/Notification");
const User = require("../models/User");

const { sendEmail } = require("./emailService");
const { emitNotification } = require("./socketService");

/**
 * Normalize notification channels.
 */
const normalizeChannels = (channels = ["in_app"]) => {
  if (!Array.isArray(channels) || channels.length === 0) {
    return ["in_app"];
  }

  const allowedChannels = ["in_app", "email", "sms", "whatsapp", "push"];

  return [
    ...new Set(channels.filter((channel) => allowedChannels.includes(channel))),
  ];
};

/**
 * Build default delivery status.
 */
const buildDeliveryStatus = (channels) => ({
  in_app: channels.includes("in_app") ? "sent" : "not_requested",

  email: channels.includes("email") ? "pending" : "not_requested",

  sms: channels.includes("sms") ? "pending" : "not_requested",

  whatsapp: channels.includes("whatsapp") ? "pending" : "not_requested",

  push: channels.includes("push") ? "pending" : "not_requested",
});

/**
 * Build notification email content.
 */
const buildEmailContent = ({ title, message, type }) => {
  const safeTitle = String(title || "");
  const safeMessage = String(message || "");

  return {
    subject: `Force Strike CRM - ${safeTitle}`,

    text: `${safeTitle}

${safeMessage}

Force Strike Martial Arts Academy
This is an automated notification from the CRM.`,

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>${safeTitle}</title>
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f4f4f1;
            font-family:Arial,Helvetica,sans-serif;
          "
        >
          <div
            style="
              max-width:600px;
              margin:40px auto;
              background:#ffffff;
              border-radius:12px;
              overflow:hidden;
              border:1px solid #e5e5e5;
            "
          >
            <div
              style="
                background:#090a0c;
                color:#ffffff;
                padding:24px;
              "
            >
              <h2 style="margin:0;">
                Force Strike Martial Arts Academy
              </h2>
            </div>

            <div style="padding:32px;">
              <h2
                style="
                  margin-top:0;
                  color:#111111;
                "
              >
                ${safeTitle}
              </h2>

              <p
                style="
                  color:#444444;
                  line-height:1.7;
                  white-space:pre-line;
                "
              >
                ${safeMessage}
              </p>

              <div
                style="
                  margin-top:28px;
                  padding:14px 16px;
                  background:#f7f7f7;
                  border-radius:8px;
                  color:#666666;
                  font-size:13px;
                "
              >
                Notification type:
                <strong>${type}</strong>
              </div>
            </div>

            <div
              style="
                padding:18px 32px;
                background:#fafafa;
                color:#777777;
                font-size:12px;
              "
            >
              This is an automated notification from
              Force Strike CRM.
            </div>
          </div>
        </body>
      </html>
    `,
  };
};

/**
 * Send email notification.
 */
const deliverEmailNotification = async ({ notification, user }) => {
  if (!notification || !user) {
    return {
      success: false,
      error: "Notification or user is missing.",
    };
  }

  if (!user.email) {
    return {
      success: false,
      error: "Recipient email is not available.",
    };
  }

  const emailContent = buildEmailContent({
    title: notification.title,
    message: notification.message,
    type: notification.type,
  });

  return sendEmail({
    to: user.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });
};

/**
 * Deliver requested external channels.
 */
const deliverNotification = async ({ notification, user }) => {
  if (!notification) {
    return null;
  }

  const requestedChannels = notification.channels || ["in_app"];

  /**
   * EMAIL
   */
  if (requestedChannels.includes("email")) {
    try {
      const emailResult = await deliverEmailNotification({
        notification,
        user,
      });

      notification.deliveryStatus.email = emailResult.success
        ? "sent"
        : "failed";

      if (!emailResult.success) {
        console.error("Notification email failed:", emailResult.error);
      }
    } catch (error) {
      notification.deliveryStatus.email = "failed";

      console.error("Notification email delivery error:", error.message);
    }
  }

  /**
   * SMS
   */
  if (requestedChannels.includes("sms")) {
    console.log("SMS notification pending provider integration.");

    notification.deliveryStatus.sms = "pending";
  }

  /**
   * WHATSAPP
   */
  if (requestedChannels.includes("whatsapp")) {
    console.log("WhatsApp notification pending provider integration.");

    notification.deliveryStatus.whatsapp = "pending";
  }

  /**
   * PUSH
   */
  if (requestedChannels.includes("push")) {
    console.log("Push notification pending provider integration.");

    notification.deliveryStatus.push = "pending";
  }

  await notification.save();

  return notification;
};

/**
 * Emit real-time notification.
 */
const emitRealtimeNotification = (notification) => {
  try {
    if (!notification) {
      return;
    }

    const notificationPayload =
      typeof notification.toObject === "function"
        ? notification.toObject()
        : notification;

    emitNotification(notification.recipient, notificationPayload);

    console.log("Real-time notification emitted:", String(notification._id));
  } catch (error) {
    /**
     * Socket failure must NOT break
     * database/email notification flow.
     */
    console.error("Real-time notification emit failed:", error.message);
  }
};

/**
 * Create a notification for one user.
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedEntity = "",
  relatedEntityId = null,
  metadata = {},
  channels = ["in_app"],
}) => {
  try {
    if (!recipient) {
      return null;
    }

    if (!type || !title || !message) {
      return null;
    }

    const user = await User.findById(recipient).select(
      "_id email phone firstName lastName role",
    );

    if (!user) {
      return null;
    }

    const normalizedChannels = normalizeChannels(channels);

    const deliveryStatus = buildDeliveryStatus(normalizedChannels);

    /**
     * Create in-app notification first.
     */
    const notification = await Notification.create({
      recipient: user._id,
      type,
      title,
      message,
      relatedEntity,
      relatedEntityId,
      metadata,
      channels: normalizedChannels,
      deliveryStatus,
    });

    /**
     * Deliver external channels.
     */
    if (
      normalizedChannels.some((channel) =>
        ["email", "sms", "whatsapp", "push"].includes(channel),
      )
    ) {
      await deliverNotification({
        notification,
        user,
      });
    }

    /**
     * REAL-TIME SOCKET.IO
     *
     * This MUST happen inside the running
     * Express/Socket.IO server process.
     */
    if (normalizedChannels.includes("in_app")) {
      emitRealtimeNotification(notification);
    }

    return notification;
  } catch (error) {
    console.error("Create notification error:", error.message);

    return null;
  }
};

/**
 * Create same notification for multiple users.
 */
const createNotifications = async ({
  recipients = [],
  type,
  title,
  message,
  relatedEntity = "",
  relatedEntityId = null,
  metadata = {},
  channels = ["in_app"],
}) => {
  try {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return [];
    }

    if (!type || !title || !message) {
      return [];
    }

    const uniqueRecipients = [
      ...new Set(recipients.filter(Boolean).map((id) => String(id))),
    ];

    if (uniqueRecipients.length === 0) {
      return [];
    }

    const validUsers = await User.find({
      _id: {
        $in: uniqueRecipients,
      },
    }).select("_id email phone firstName lastName role");

    if (validUsers.length === 0) {
      return [];
    }

    const normalizedChannels = normalizeChannels(channels);

    const deliveryStatus = buildDeliveryStatus(normalizedChannels);

    const documents = validUsers.map((user) => ({
      recipient: user._id,
      type,
      title,
      message,
      relatedEntity,
      relatedEntityId,
      metadata,
      channels: normalizedChannels,
      deliveryStatus: {
        ...deliveryStatus,
      },
    }));

    const notifications = await Notification.insertMany(documents);

    const externalChannels = normalizedChannels.filter((channel) =>
      ["email", "sms", "whatsapp", "push"].includes(channel),
    );

    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];

      const user = validUsers.find(
        (item) => String(item._id) === String(notification.recipient),
      );

      if (!user) {
        continue;
      }

      if (externalChannels.length > 0) {
        await deliverNotification({
          notification,
          user,
        });
      }

      if (normalizedChannels.includes("in_app")) {
        emitRealtimeNotification(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error("Create multiple notifications error:", error.message);

    return [];
  }
};

/**
 * Get unread notification count.
 */
const getUnreadNotificationCount = async (userId) => {
  if (!userId) {
    return 0;
  }

  return Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
};

/**
 * Mark one notification as read.
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    return null;
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();
  }

  return notification;
};

/**
 * Mark all user's notifications as read.
 */
const markAllNotificationsAsRead = async (userId) => {
  if (!userId) {
    return 0;
  }

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  return result.modifiedCount || 0;
};

module.exports = {
  createNotification,
  createNotifications,
  deliverNotification,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
