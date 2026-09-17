const admin = require("firebase-admin");

let initialized = false;

const initializeFirebase = () => {
  if (initialized) {
    return;
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "Firebase push configuration is incomplete."
    );
  }

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    );

  admin.initializeApp({
    credential:
      admin.credential.cert({
        projectId:
          process.env.FIREBASE_PROJECT_ID,

        clientEmail:
          process.env.FIREBASE_CLIENT_EMAIL,

        privateKey,
      }),
  });

  initialized = true;
};

const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
    if (!token) {
      return {
        success: false,
        error:
          "FCM registration token is required.",
      };
    }

    if (!title) {
      return {
        success: false,
        error:
          "Push notification title is required.",
      };
    }

    initializeFirebase();

    const stringData = Object.entries(
      data || {}
    ).reduce((result, [key, value]) => {
      result[String(key)] =
        String(value);

      return result;
    }, {});

    const message = {
      token,

      notification: {
        title,
        body: body || "",
      },

      data: stringData,
    };

    const messageId =
      await admin
        .messaging()
        .send(message);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error(
      "Push notification error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
      code:
        error.code ||
        "PUSH_SEND_FAILED",
    };
  }
};

module.exports = {
  sendPushNotification,
};