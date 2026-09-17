const crypto = require("crypto");
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const FeeAssignment = require("../models/FeeAssignment");
const {
  createAuditLog,
} = require("../services/auditLogService");
const {
  createNotifications,
} = require("../services/notificationService");

const verifyWebhookSignature = (
  rawBody,
  signature
) => {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured"
    );
  }

  if (
    !Buffer.isBuffer(rawBody) ||
    typeof signature !== "string"
  ) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (
    expectedSignature.length !==
    signature.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
};

const processCapturedPayment = async (
  payload
) => {
  const paymentEntity =
    payload?.payload?.payment?.entity;

  if (!paymentEntity) {
    return;
  }

  const razorpayOrderId =
    paymentEntity.order_id;

  const razorpayPaymentId =
    paymentEntity.id;

  if (
    !razorpayOrderId ||
    !razorpayPaymentId
  ) {
    return;
  }

  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const payment =
      await Payment.findOne({
        razorpayOrderId,
      }).session(session);

    // Unknown order: safely acknowledge webhook.
    if (!payment) {
      await session.commitTransaction();
      return;
    }

    // Idempotency
    if (
      payment.paymentStatus === "success"
    ) {
      await session.commitTransaction();
      return;
    }

    const assignment =
      await FeeAssignment.findById(
        payment.feeAssignment
      ).session(session);

    if (!assignment) {
      throw new Error(
        "Fee assignment not found"
      );
    }

    if (
      assignment.status === "cancelled"
    ) {
      throw new Error(
        "Fee assignment is cancelled"
      );
    }

    const paymentAmount =
      Number(payment.amount);

    const remainingAmount =
      Number(assignment.remainingAmount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      throw new Error(
        "Invalid payment amount"
      );
    }

    if (
      paymentAmount > remainingAmount
    ) {
      throw new Error(
        "Webhook payment amount exceeds remaining fee amount"
      );
    }

    const duplicatePayment =
      await Payment.findOne({
        razorpayPaymentId,
        _id: { $ne: payment._id },
      }).session(session);

    if (duplicatePayment) {
      throw new Error(
        "Razorpay payment ID is already linked to another payment"
      );
    }

    payment.paymentStatus = "success";
    payment.razorpayPaymentId =
      razorpayPaymentId;
    payment.transactionId =
      razorpayPaymentId;

    payment.paymentDate =
      paymentEntity.created_at
        ? new Date(
            paymentEntity.created_at * 1000
          )
        : new Date();

    await payment.save({ session });

    assignment.paidAmount =
      Number(assignment.paidAmount || 0) +
      paymentAmount;

    assignment.remainingAmount =
      Math.max(
        0,
        Number(
          assignment.payableAmount
        ) -
          assignment.paidAmount
      );

    if (
      assignment.remainingAmount === 0
    ) {
      assignment.status = "paid";
    } else {
      assignment.status = "partial";
    }

    await assignment.save({ session });

    await session.commitTransaction();

    await createAuditLog({
      userId: null,
      action:
        "RAZORPAY_WEBHOOK_PAYMENT_CAPTURED",
      entity: "Payment",
      entityId: payment._id,
      metadata: {
        paymentNumber:
          payment.paymentNumber,
        razorpayOrderId,
        razorpayPaymentId,
        amount: payment.amount,
        source: "webhook",
      },
    });

    try {
      const User = require("../models/User");

      const student =
        await User.findById(
          payment.student
        ).select(
          "firstName lastName parents"
        );

      const parentIds =
        Array.isArray(student?.parents)
          ? student.parents
          : [];

      if (parentIds.length > 0) {
        const studentName =
          `${student.firstName || ""} ${
            student.lastName || ""
          }`.trim();

        await createNotifications({
          recipients: parentIds,
          type: "payment_success",
          title: "Payment Successful",
          message: `A payment of ₹${Number(
            payment.amount
          ).toLocaleString(
            "en-IN"
          )} for ${studentName} has been received successfully.`,
          relatedEntity: "Payment",
          relatedEntityId:
            payment._id,
          metadata: {
            paymentNumber:
              payment.paymentNumber,
            razorpayPaymentId,
            amount: payment.amount,
          },
          channels: ["in_app"],
        });
      }
    } catch (notificationError) {
      console.error(
        "Webhook notification error:",
        notificationError.message
      );
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const processFailedPayment = async (
  payload
) => {
  const paymentEntity =
    payload?.payload?.payment?.entity;

  if (!paymentEntity) {
    return;
  }

  const razorpayOrderId =
    paymentEntity.order_id;

  if (!razorpayOrderId) {
    return;
  }

  const payment =
    await Payment.findOne({
      razorpayOrderId,
    });

  if (!payment) {
    return;
  }

  // Never overwrite a successful payment.
  if (
    payment.paymentStatus === "success"
  ) {
    return;
  }

  payment.paymentStatus = "failed";

  if (paymentEntity.id) {
    payment.razorpayPaymentId =
      paymentEntity.id;
    payment.transactionId =
      paymentEntity.id;
  }

  payment.notes =
    payment.notes ||
    "Razorpay payment failed";

  await payment.save();

  await createAuditLog({
    userId: null,
    action:
      "RAZORPAY_WEBHOOK_PAYMENT_FAILED",
    entity: "Payment",
    entityId: payment._id,
    metadata: {
      paymentNumber:
        payment.paymentNumber,
      razorpayOrderId,
      razorpayPaymentId:
        paymentEntity.id || null,
      source: "webhook",
    },
  });
};

const razorpayWebhook = async (
  req,
  res
) => {
  try {
    const signature =
      req.headers[
        "x-razorpay-signature"
      ];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Razorpay webhook signature",
        code: "WEBHOOK_SIGNATURE_MISSING",
        errors: [],
      });
    }

    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook body",
        code: "INVALID_WEBHOOK_BODY",
        errors: [],
      });
    }

    const isValid =
      verifyWebhookSignature(
        rawBody,
        signature
      );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Razorpay webhook signature",
        code: "INVALID_WEBHOOK_SIGNATURE",
        errors: [],
      });
    }

    let payload;

    try {
      payload = JSON.parse(
        rawBody.toString("utf8")
      );
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook JSON payload",
        code: "INVALID_WEBHOOK_JSON",
        errors: [],
      });
    }

    const event = payload?.event;

    switch (event) {
      case "payment.captured":
        await processCapturedPayment(
          payload
        );
        break;

      case "payment.failed":
        await processFailedPayment(
          payload
        );
        break;

      case "payment.authorized":
        // Do not settle fee here.
        break;

      default:
        // Safely acknowledge unsupported events.
        break;
    }

    return res.status(200).json({
      success: true,
      message:
        "Webhook processed successfully",
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed",
      code: "WEBHOOK_PROCESSING_FAILED",
      errors: [],
    });
  }
};

module.exports = {
  razorpayWebhook,
};