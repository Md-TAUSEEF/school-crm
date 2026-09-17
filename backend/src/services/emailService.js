const nodemailer = require("nodemailer");

const requiredEnv = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM_EMAIL",
];

const missingEnv = requiredEnv.filter(
  (key) => !process.env[key]
);

if (missingEnv.length > 0) {
  console.warn(
    `Email service: missing environment variables: ${missingEnv.join(
      ", "
    )}`
  );
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure:
    String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify SMTP configuration.
 * Useful during server startup/testing.
 */
const verifyEmailTransporter = async () => {
  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn(
        "Email transporter verification skipped: SMTP configuration is incomplete."
      );

      return false;
    }

    await transporter.verify();

    console.log("Email SMTP transporter is ready.");

    return true;
  } catch (error) {
    console.error(
      "Email transporter verification failed:",
      error.message
    );

    return false;
  }
};

/**
 * Send generic email.
 */
const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo = undefined,
}) => {
  try {
    if (!to || !subject || (!text && !html)) {
      return {
        success: false,
        error: "Email recipient, subject and content are required.",
      };
    }

    const mailOptions = {
      from:
        process.env.SMTP_FROM_NAME
          ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`
          : process.env.SMTP_FROM_EMAIL,

      to,

      subject,

      text: text || "",

      html: html || undefined,

      ...(replyTo ? { replyTo } : {}),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error(
      "Send email error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  transporter,
  verifyEmailTransporter,
  sendEmail,
};