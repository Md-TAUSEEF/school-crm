require("dotenv").config();

const {
  verifyEmailTransporter,
  sendEmail,
} = require("../../backend/src/services/emailService");

const run = async () => {
  console.log("Checking SMTP configuration...");

  const verified =
    await verifyEmailTransporter();

  if (!verified) {
    console.error(
      "SMTP transporter verification failed."
    );

    process.exit(1);
  }

  const result = await sendEmail({
    to: process.env.SMTP_USER,
    subject:
      "Force Strike CRM - Email Test",
    text:
      "This is a test email from Force Strike CRM.",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Force Strike CRM</h2>
        <p>
          This is a test email from the CRM notification system.
        </p>
        <p>
          If you received this email, SMTP is working correctly.
        </p>
      </div>
    `,
  });

  console.log(result);

  process.exit(
    result.success ? 0 : 1
  );
};

run();