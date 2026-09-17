const mongoose = require("mongoose");

const pushTokenSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      token: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      platform: {
        type: String,
        enum: [
          "web",
          "android",
          "ios",
        ],
        default: "web",
      },

      userAgent: {
        type: String,
        default: "",
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      lastUsedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

pushTokenSchema.index({
  user: 1,
  isActive: 1,
});

module.exports =
  mongoose.model(
    "PushToken",
    pushTokenSchema
  );