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
      "Twilio WhatsApp configuration is incomplete."
    );
  }

  client = twilio(
    accountSid,
    authToken
  );

  return client;
};

const normalizeWhatsAppNumber = (
  phone
) => {
  if (!phone) {
    return "";
  }

  const value = String(phone).trim();

  if (value.startsWith("whatsapp:")) {
    return value;
  }

  return `whatsapp:${value}`;
};

const sendWhatsApp = async ({
  to,
  body,
  contentSid,
  contentVariables,
}) => {
  try {
    if (!to) {
      return {
        success: false,
        error:
          "WhatsApp recipient phone number is required.",
      };
    }

    const from =
      process.env.TWILIO_WHATSAPP_FROM;

    if (!from) {
      return {
        success: false,
        error:
          "TWILIO_WHATSAPP_FROM is not configured.",
      };
    }

    const twilioClient =
      getTwilioClient();

    const payload = {
      from: from.startsWith("whatsapp:")
        ? from
        : `whatsapp:${from}`,

      to: normalizeWhatsAppNumber(to),
    };

    /*
     * WhatsApp template message
     */
    if (contentSid) {
      payload.contentSid = contentSid;

      if (contentVariables) {
        payload.contentVariables =
          JSON.stringify(
            contentVariables
          );
      }
    } else {
      /*
       * Free-form message.
       * WhatsApp provider/account rules
       * still apply.
       */
      if (!body) {
        return {
          success: false,
          error:
            "WhatsApp body or contentSid is required.",
        };
      }

      payload.body = body;
    }

    const message =
      await twilioClient.messages.create(
        payload
      );

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error(
      "WhatsApp delivery error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
      code:
        error.code ||
        "WHATSAPP_SEND_FAILED",
    };
  }
};

module.exports = {
  sendWhatsApp,
};