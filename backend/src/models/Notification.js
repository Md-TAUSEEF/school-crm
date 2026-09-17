const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "attendance_absent",
        "renewal_reminder",
        "renewal_overdue",
        "query_response",
        "payment_success",
        "class_reminder",
        "general",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    relatedEntity: {
      type: String,
      trim: true,
      default: "",
    },

    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    channels: {
      type: [
        {
          type: String,
          enum: ["in_app", "email", "sms", "whatsapp", "push"],
        },
      ],
      default: ["in_app"],
    },

    deliveryStatus: {
      in_app: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "sent",
      },

      email: {
        type: String,
        enum: ["pending", "sent", "failed", "not_requested"],
        default: "not_requested",
      },

      sms: {
        type: String,
        enum: ["pending", "sent", "failed", "not_requested"],
        default: "not_requested",
      },

      whatsapp: {
        type: String,
        enum: ["pending", "sent", "failed", "not_requested"],
        default: "not_requested",
      },

      push: {
        type: String,
        enum: ["pending", "sent", "failed", "not_requested"],
        default: "not_requested",
      },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  type: 1,
  createdAt: -1,
});

notificationSchema.index({
  relatedEntity: 1,
  relatedEntityId: 1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);