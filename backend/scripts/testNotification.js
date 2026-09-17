require("dotenv").config();

const mongoose = require("mongoose");

const User = require("../src/models/User");
const {
  createNotification,
} = require("../src/services/notificationService");

const run = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    // Find an existing active user.
   const user = await User.findById(
  "6aa928a77fe0d851787965bb"
).select(
  "_id firstName lastName email role userId"
);

    if (!user) {
      console.error(
        "No active user found in database."
      );

      process.exit(1);
    }

    console.log("\nUsing existing user:");
    console.log({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      userId: user.userId,
    });

    console.log(
      "\nCreating in-app + email notification..."
    );

    const notification =
      await createNotification({
        recipient: user._id,
        type: "general",
        title: "Notification System Test",
        message:
          "This is a real notification test from Force Strike CRM.",
        metadata: {
          test: true,
          source: "notification-test-script",
        },
        channels: [
          "in_app",
          "email",
        ],
      });

    if (!notification) {
      console.error(
        "\nNotification creation failed."
      );

      process.exit(1);
    }

    console.log("\nNotification created successfully.");

    console.log({
      notificationId: notification._id,
      recipient: notification.recipient,
      type: notification.type,
      channels: notification.channels,
      deliveryStatus:
        notification.deliveryStatus,
      isRead: notification.isRead,
    });

    console.log(
      "\nEmail delivery status:",
      notification.deliveryStatus.email
    );

    console.log(
      "\nIn-app delivery status:",
      notification.deliveryStatus.in_app
    );

    await mongoose.disconnect();

    console.log("\nMongoDB disconnected.");

    process.exit(0);
  } catch (error) {
    console.error(
      "\nNotification test error:",
      error
    );

    try {
      await mongoose.disconnect();
    } catch (_) {}

    process.exit(1);
  }
};

run();