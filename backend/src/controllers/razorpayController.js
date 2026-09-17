const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const Payment = require("../models/Payment");
const FeeAssignment = require("../models/FeeAssignment");
const User = require("../models/User");
const AcademicSession = require("../models/AcademicSession");
const { createAuditLog } = require("../services/auditLogService");
const { createNotifications } = require("../services/notificationService");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const sendServerError = (res, message, code) => {
  return res.status(500).json({
    success: false,
    message,
    code,
    errors: [],
  });
};

const generatePaymentNumber = async (session = null) => {
  const year = new Date().getFullYear();

  const query = Payment.findOne({
    paymentNumber: new RegExp(`^PAY-${year}-`),
  }).sort({ createdAt: -1 });

  if (session) {
    query.session(session);
  }

  const lastPayment = await query;

  let nextNumber = 1;

  if (lastPayment?.paymentNumber) {
    const parts = lastPayment.paymentNumber.split("-");
    const parsedNumber = Number(parts[2]);

    if (Number.isInteger(parsedNumber)) {
      nextNumber = parsedNumber + 1;
    }
  }

  return `PAY-${year}-${String(nextNumber).padStart(6, "0")}`;
};

// ======================================================
// CREATE RAZORPAY ORDER
// ======================================================

const createRazorpayOrder = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      feeAssignment,
    } = req.body;

    if (!student || !academicSession || !feeAssignment) {
      return res.status(400).json({
        success: false,
        message:
          "student, academicSession and feeAssignment are required",
        code: "REQUIRED_FIELDS_MISSING",
        errors: [],
      });
    }

    if (
      !isValidObjectId(student) ||
      !isValidObjectId(academicSession) ||
      !isValidObjectId(feeAssignment)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student, academic session or fee assignment ID",
        code: "INVALID_ID",
        errors: [],
      });
    }

    const studentUser = await User.findById(student).select(
      "_id firstName lastName email phone userId role status parents"
    );

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
        code: "STUDENT_NOT_FOUND",
        errors: [],
      });
    }

    if (studentUser.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a student",
        code: "INVALID_STUDENT",
        errors: [],
      });
    }

    if (studentUser.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Inactive or suspended student cannot make a payment",
        code: "STUDENT_NOT_ACTIVE",
        errors: [],
      });
    }

    const session = await AcademicSession.findById(
      academicSession
    ).select("_id name code status");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        code: "ACADEMIC_SESSION_NOT_FOUND",
        errors: [],
      });
    }

    const assignment = await FeeAssignment.findById(
      feeAssignment
    ).select(
      "_id student academicSession payableAmount paidAmount remainingAmount status"
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Fee assignment not found",
        code: "FEE_ASSIGNMENT_NOT_FOUND",
        errors: [],
      });
    }

    if (
      assignment.student.toString() !== student.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee assignment does not belong to this student",
        code: "FEE_ASSIGNMENT_STUDENT_MISMATCH",
        errors: [],
      });
    }

    if (
      assignment.academicSession.toString() !==
      academicSession.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee assignment does not belong to this academic session",
        code: "FEE_ASSIGNMENT_SESSION_MISMATCH",
        errors: [],
      });
    }

    if (assignment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot create payment order for a cancelled fee assignment",
        code: "FEE_ASSIGNMENT_CANCELLED",
        errors: [],
      });
    }

    const remainingAmount = Number(
      assignment.remainingAmount
    );

    if (
      !Number.isFinite(remainingAmount) ||
      remainingAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No remaining amount is available for payment",
        code: "NO_REMAINING_AMOUNT",
        errors: [],
      });
    }

    // Backend is the source of truth for amount.
    const amount = remainingAmount;
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
        code: "INVALID_PAYMENT_AMOUNT",
        errors: [],
      });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `fee_${assignment._id}_${Date.now()}`,
      notes: {
        studentId: student.toString(),
        academicSessionId: academicSession.toString(),
        feeAssignmentId: feeAssignment.toString(),
      },
    });

    const paymentNumber = await generatePaymentNumber();

    const payment = await Payment.create({
      paymentNumber,
      student,
      academicSession,
      feeAssignment,
      amount,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      transactionId: "",
      razorpayOrderId: order.id,
      razorpayPaymentId: "",
      razorpaySignature: "",
      paymentDate: new Date(),
      notes: "Razorpay payment initiated",
      receivedBy: req.user?._id || null,
    });

    await createAuditLog({
      userId: req.user?._id || req.user?.id || null,
      action: "RAZORPAY_ORDER_CREATE",
      entity: "Payment",
      entityId: payment._id,
      metadata: {
        paymentNumber: payment.paymentNumber,
        razorpayOrderId: order.id,
        amount,
        student,
        academicSession,
        feeAssignment,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      data: {
        orderId: order.id,
        paymentId: payment._id,
        paymentNumber: payment.paymentNumber,
        amount,
        amountInPaise: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        student,
        academicSession,
        feeAssignment,
      },
    });
  } catch (error) {
    console.error(
      "Create Razorpay order error:",
      error.message
    );

    return sendServerError(
      res,
      "Failed to create Razorpay order",
      "RAZORPAY_ORDER_CREATE_FAILED"
    );
  }
};

// ======================================================
// VERIFY RAZORPAY PAYMENT
// ======================================================

const verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        code: "RAZORPAY_VERIFICATION_FIELDS_MISSING",
        errors: [],
      });
    }

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay verification fields",
        code: "INVALID_RAZORPAY_FIELDS",
        errors: [],
      });
    }

    // --------------------------------------------------
    // Verify signature safely
    // --------------------------------------------------

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (
      generatedSignature.length !==
      razorpay_signature.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
        code: "INVALID_RAZORPAY_SIGNATURE",
        errors: [],
      });
    }

    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!signatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
        code: "INVALID_RAZORPAY_SIGNATURE",
        errors: [],
      });
    }

    session.startTransaction();

    // --------------------------------------------------
    // Lock payment record logically through transaction
    // --------------------------------------------------

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    }).session(session);

    if (!payment) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message:
          "Razorpay payment record not found for this order",
        code: "RAZORPAY_PAYMENT_RECORD_NOT_FOUND",
        errors: [],
      });
    }

    // Already processed
    if (payment.paymentStatus === "success") {
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Razorpay payment already verified",
        data: {
          paymentId: payment._id,
          paymentNumber: payment.paymentNumber,
          paymentStatus: payment.paymentStatus,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
        },
      });
    }

    // --------------------------------------------------
    // Verify Razorpay order/payment from Razorpay server
    // --------------------------------------------------

    const razorpayOrder = await razorpay.orders.fetch(
      razorpay_order_id
    );

    if (!razorpayOrder) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Razorpay order could not be verified",
        code: "RAZORPAY_ORDER_NOT_FOUND",
        errors: [],
      });
    }

    if (razorpayOrder.currency !== "INR") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay order currency",
        code: "INVALID_RAZORPAY_CURRENCY",
        errors: [],
      });
    }

    const expectedAmount = Math.round(
      Number(payment.amount) * 100
    );

    if (
      Number(razorpayOrder.amount) !== expectedAmount
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Razorpay order amount mismatch",
        code: "RAZORPAY_AMOUNT_MISMATCH",
        errors: [],
      });
    }

    if (
      razorpayOrder.status !== "paid"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Razorpay order has not been paid",
        code: "RAZORPAY_ORDER_NOT_PAID",
        errors: [],
      });
    }

    const razorpayPayment =
      await razorpay.payments.fetch(
        razorpay_payment_id
      );

    if (!razorpayPayment) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Razorpay payment could not be verified",
        code: "RAZORPAY_PAYMENT_NOT_FOUND",
        errors: [],
      });
    }

    if (
      razorpayPayment.order_id !==
      razorpay_order_id
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Razorpay payment does not belong to this order",
        code: "RAZORPAY_PAYMENT_ORDER_MISMATCH",
        errors: [],
      });
    }

    if (razorpayPayment.status !== "captured") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Razorpay payment has not been captured",
        code: "RAZORPAY_PAYMENT_NOT_CAPTURED",
        errors: [],
      });
    }

    if (
      Number(razorpayPayment.amount) !==
      expectedAmount
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Razorpay payment amount mismatch",
        code: "RAZORPAY_PAYMENT_AMOUNT_MISMATCH",
        errors: [],
      });
    }

    // Prevent same payment ID from being reused
    const existingPayment = await Payment.findOne({
      razorpayPaymentId: razorpay_payment_id,
      _id: { $ne: payment._id },
    }).session(session);

    if (existingPayment) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message:
          "This Razorpay payment has already been processed",
        code: "RAZORPAY_PAYMENT_ALREADY_PROCESSED",
        errors: [],
      });
    }

    const assignment = await FeeAssignment.findById(
      payment.feeAssignment
    ).session(session);

    if (!assignment) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Fee assignment not found",
        code: "FEE_ASSIGNMENT_NOT_FOUND",
        errors: [],
      });
    }

    if (assignment.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Cannot complete payment for a cancelled fee assignment",
        code: "FEE_ASSIGNMENT_CANCELLED",
        errors: [],
      });
    }

    if (
      Number(payment.amount) >
      Number(assignment.remainingAmount)
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount is greater than the remaining fee amount",
        code: "PAYMENT_AMOUNT_EXCEEDS_REMAINING",
        errors: [],
      });
    }

    // --------------------------------------------------
    // Update payment
    // --------------------------------------------------

    payment.paymentStatus = "success";
    payment.razorpayPaymentId =
      razorpay_payment_id;
    payment.razorpaySignature =
      razorpay_signature;
    payment.transactionId =
      razorpay_payment_id;
    payment.paymentDate =
      razorpayPayment.created_at
        ? new Date(
            razorpayPayment.created_at * 1000
          )
        : new Date();

    await payment.save({ session });

    // --------------------------------------------------
    // Update Fee Assignment
    // --------------------------------------------------

    const newPaidAmount =
      Number(assignment.paidAmount) +
      Number(payment.amount);

    const newRemainingAmount =
      Number(assignment.payableAmount) -
      newPaidAmount;

    assignment.paidAmount = newPaidAmount;
    assignment.remainingAmount = Math.max(
      0,
      newRemainingAmount
    );

    if (assignment.remainingAmount === 0) {
      assignment.status = "paid";
    } else {
      assignment.status = "partial";
    }

    await assignment.save({ session });

    await session.commitTransaction();

    // --------------------------------------------------
    // Audit after successful transaction
    // --------------------------------------------------

    await createAuditLog({
      userId: req.user?._id || req.user?.id || null,
      action: "RAZORPAY_PAYMENT_SUCCESS",
      entity: "Payment",
      entityId: payment._id,
      metadata: {
        paymentNumber: payment.paymentNumber,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount,
        feeAssignment: payment.feeAssignment,
      },
      req,
    });

    // --------------------------------------------------
    // Notify linked parents
    // --------------------------------------------------

    try {
      const studentUser = await User.findById(
        payment.student
      ).select(
        "firstName lastName parents role"
      );

      const parentIds = Array.isArray(
        studentUser?.parents
      )
        ? studentUser.parents
        : [];

      if (parentIds.length > 0) {
        const studentName =
          `${studentUser.firstName || ""} ${
            studentUser.lastName || ""
          }`.trim();

        await createNotifications({
          recipients: parentIds,
          type: "payment_success",
          title: "Payment Successful",
          message: `A Razorpay payment of ₹${Number(
            payment.amount
          ).toLocaleString(
            "en-IN"
          )} for ${studentName} has been received successfully.`,
          relatedEntity: "Payment",
          relatedEntityId: payment._id,
          metadata: {
            paymentNumber:
              payment.paymentNumber,
            razorpayPaymentId:
              razorpay_payment_id,
            amount: payment.amount,
          },
          channels: ["in_app"],
        });
      }
    } catch (notificationError) {
      console.error(
        "Razorpay payment notification error:",
        notificationError.message
      );
    }

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "student",
          "firstName lastName email phone userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate("feeAssignment");

    return res.status(200).json({
      success: true,
      message:
        "Razorpay payment verified successfully",
      data: populatedPayment,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Verify Razorpay payment error:",
      error.message
    );

    return sendServerError(
      res,
      "Failed to verify Razorpay payment",
      "RAZORPAY_PAYMENT_VERIFICATION_FAILED"
    );
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};