const twilio = require("twilio");

let client = null;

const getTwilioClient = () => {
  if (client) {
    return client;
  }

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;

  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio SMS configuration is incomplete."
    );
  }

  client = twilio(
    accountSid,
    authToken
  );

  return client;
};

const sendSms = async ({
  to,
  body,
}) => {
  try {
    if (!to) {
      return {
        success: false,
        error: "SMS recipient phone number is required.",
      };
    }

    if (!body) {
      return {
        success: false,
        error: "SMS body is required.",
      };
    }

    const from =
      process.env.TWILIO_SMS_FROM;

    if (!from) {
      return {
        success: false,
        error:
          "TWILIO_SMS_FROM is not configured.",
      };
    }

    const twilioClient =
      getTwilioClient();

    const message =
      await twilioClient.messages.create({
        body,
        from,
        to,
      });

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error(
      "SMS delivery error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
      code: error.code || "SMS_SEND_FAILED",
    };
  }
};

module.exports = {
  sendSms,
};