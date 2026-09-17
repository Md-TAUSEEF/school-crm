const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const FeeAssignment = require("../models/FeeAssignment");
const Renewal = require("../models/Renewal");
const Membership = require("../models/Membership");
const User = require("../models/User");
const AcademicSession = require("../models/AcademicSession");

const { createAuditLog } = require("../services/auditLogService");

const { createNotifications } = require("../services/notificationService");

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
    nextNumber = Number(parts[2]) + 1;
  }

  return `PAY-${year}-${String(nextNumber).padStart(6, "0")}`;
};

// ==================================================
// CREATE PAYMENT
// ==================================================

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      student,
      academicSession,
      feeAssignment = null,
      renewal = null,
      amount,
      paymentMethod,
      paymentStatus = "success",
      transactionId = "",
      paymentDate,
      notes = "",
    } = req.body;

    // --------------------------------------------------
    // PAYMENT TARGET VALIDATION
    // --------------------------------------------------

    if (
      !student ||
      !academicSession ||
      amount === undefined ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message:
          "student, academicSession, amount and paymentMethod are required",
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    if (feeAssignment && renewal) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be linked to both fee assignment and renewal",
        code: "MULTIPLE_PAYMENT_TARGETS",
      });
    }

    if (!feeAssignment && !renewal) {
      return res.status(400).json({
        success: false,
        message: "Either feeAssignment or renewal is required",
        code: "PAYMENT_TARGET_MISSING",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
        code: "INVALID_PAYMENT_AMOUNT",
      });
    }

    const normalizedTransactionId = String(transactionId || "").trim();

    // --------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------

    session.startTransaction();

    // ==================================================
    // VALIDATE STUDENT
    // ==================================================

    const studentUser = await User.findById(student).session(session);

    if (!studentUser) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Student not found",
        code: "STUDENT_NOT_FOUND",
      });
    }

    if (studentUser.role !== "student") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Selected user is not a student",
        code: "INVALID_STUDENT",
      });
    }

    // ==================================================
    // VALIDATE ACADEMIC SESSION
    // ==================================================

    const academicSessionData =
      await AcademicSession.findById(academicSession).session(session);

    if (!academicSessionData) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        code: "ACADEMIC_SESSION_NOT_FOUND",
      });
    }

    // ==================================================
    // DUPLICATE TRANSACTION CHECK
    // ==================================================

    if (normalizedTransactionId) {
      const existingPayment = await Payment.findOne({
        transactionId: normalizedTransactionId,
      }).session(session);

      if (existingPayment) {
        await session.abortTransaction();

        return res.status(409).json({
          success: false,
          message: "A payment with this transaction ID already exists",
          code: "DUPLICATE_TRANSACTION_ID",
          data: {
            paymentId: existingPayment._id,
            paymentNumber: existingPayment.paymentNumber,
          },
        });
      }
    }

    // --------------------------------------------------
    // PAYMENT TARGET DATA
    // --------------------------------------------------

    let assignment = null;
    let renewalData = null;

    // ==================================================
    // NORMAL FEE PAYMENT
    // ==================================================

    if (feeAssignment) {
      assignment = await FeeAssignment.findById(feeAssignment).session(
        session,
      );

      if (!assignment) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Fee assignment not found",
          code: "FEE_ASSIGNMENT_NOT_FOUND",
        });
      }

      // --------------------------------------------------
      // STUDENT MISMATCH
      // --------------------------------------------------

      if (assignment.student.toString() !== student.toString()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Fee assignment does not belong to this student",
          code: "FEE_ASSIGNMENT_STUDENT_MISMATCH",
        });
      }

      // --------------------------------------------------
      // ACADEMIC SESSION MISMATCH
      // --------------------------------------------------

      if (
        assignment.academicSession.toString() !== academicSession.toString()
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Fee assignment does not belong to this academic session",
          code: "FEE_ASSIGNMENT_SESSION_MISMATCH",
        });
      }

      // --------------------------------------------------
      // CANCELLED ASSIGNMENT
      // --------------------------------------------------

      if (assignment.status === "cancelled") {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Cannot make payment for a cancelled fee assignment",
          code: "FEE_ASSIGNMENT_CANCELLED",
        });
      }

      // --------------------------------------------------
      // ALREADY PAID
      // --------------------------------------------------

      if (
        paymentStatus === "success" &&
        Number(assignment.remainingAmount) <= 0
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Fee assignment is already fully paid",
          code: "FEE_ASSIGNMENT_ALREADY_PAID",
        });
      }

      // --------------------------------------------------
      // OVERPAYMENT PROTECTION
      // --------------------------------------------------

      if (
        paymentStatus === "success" &&
        Number(amount) > Number(assignment.remainingAmount)
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Payment amount cannot be greater than remaining amount",
          code: "PAYMENT_AMOUNT_EXCEEDS_REMAINING",
        });
      }
    }

    // ==================================================
    // RENEWAL PAYMENT
    // ==================================================

    if (renewal) {
      renewalData = await Renewal.findById(renewal).session(session);

      if (!renewalData) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Renewal not found",
          code: "RENEWAL_NOT_FOUND",
        });
      }

      // --------------------------------------------------
      // STUDENT MISMATCH
      // --------------------------------------------------

      if (renewalData.student.toString() !== student.toString()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Renewal does not belong to this student",
          code: "RENEWAL_STUDENT_MISMATCH",
        });
      }

      // --------------------------------------------------
      // ACADEMIC SESSION MISMATCH
      // --------------------------------------------------

      if (
        renewalData.academicSession.toString() !== academicSession.toString()
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Renewal does not belong to this academic session",
          code: "RENEWAL_SESSION_MISMATCH",
        });
      }

      // --------------------------------------------------
      // CANCELLED RENEWAL
      // --------------------------------------------------

      if (renewalData.status === "cancelled") {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Cannot make payment for a cancelled renewal",
          code: "RENEWAL_CANCELLED",
        });
      }

      // --------------------------------------------------
      // COMPLETED RENEWAL
      // --------------------------------------------------

      if (renewalData.status === "completed") {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Renewal is already completed",
          code: "RENEWAL_ALREADY_COMPLETED",
        });
      }

      // --------------------------------------------------
      // CANCELLED PAYMENT STATUS
      // --------------------------------------------------

      if (renewalData.paymentStatus === "cancelled") {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Cannot make payment for a cancelled renewal",
          code: "RENEWAL_PAYMENT_CANCELLED",
        });
      }

      const remainingAmount = Number(renewalData.remainingAmount);

      // --------------------------------------------------
      // ALREADY PAID
      // --------------------------------------------------

      if (paymentStatus === "success" && remainingAmount <= 0) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Renewal is already fully paid",
          code: "RENEWAL_ALREADY_PAID",
        });
      }

      // --------------------------------------------------
      // OVERPAYMENT PROTECTION
      // --------------------------------------------------

      if (paymentStatus === "success" && Number(amount) > remainingAmount) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Renewal payment amount cannot be greater than remaining amount",
          code: "RENEWAL_PAYMENT_AMOUNT_EXCEEDS_REMAINING",
        });
      }
    }

    // ==================================================
    // GENERATE PAYMENT NUMBER
    // ==================================================

    const paymentNumber = await generatePaymentNumber(session);

    // ==================================================
    // CREATE PAYMENT
    // ==================================================

    const paymentDocuments = await Payment.create(
      [
        {
          paymentNumber,

          student,

          academicSession,

          feeAssignment: feeAssignment || null,

          renewal: renewal || null,

          amount: Number(amount),

          paymentMethod,

          paymentStatus,

          transactionId: normalizedTransactionId,

          paymentDate: paymentDate || new Date(),

          notes: String(notes || "").trim(),

          receivedBy: req.user?._id || req.user?.id || null,
        },
      ],
      { session },
    );

    const payment = paymentDocuments[0];

    // ==================================================
    // SUCCESSFUL NORMAL FEE PAYMENT
    // ==================================================

    if (feeAssignment && paymentStatus === "success") {
      const newPaidAmount =
        Number(assignment.paidAmount) + Number(amount);

      const newRemainingAmount =
        Number(assignment.payableAmount) - newPaidAmount;

      assignment.paidAmount = newPaidAmount;

      assignment.remainingAmount = Math.max(
        0,
        newRemainingAmount,
      );

      // --------------------------------------------------
      // UPDATE FEE ASSIGNMENT STATUS
      // --------------------------------------------------

      if (assignment.remainingAmount === 0) {
        assignment.status = "paid";
      } else {
        assignment.status = "partial";
      }

      await assignment.save({ session });

      // ==================================================
      // AUTO ACTIVATE MEMBERSHIP AFTER FULL PAYMENT
      // ==================================================

      if (
        assignment.status === "paid" &&
        assignment.membership
      ) {
        const membership = await Membership.findById(
          assignment.membership,
        ).session(session);

        if (!membership) {
          throw new Error(
            "Linked membership not found for fee assignment",
          );
        }

        /*
         * Membership becomes active only when
         * complete fee assignment is paid.
         */

        membership.feeAssignment = assignment._id;

        membership.status = "active";

        await membership.save({ session });
      }
    }

    // ==================================================
    // SUCCESSFUL RENEWAL PAYMENT
    // ==================================================

    let newMembership = null;
    let renewalCompleted = false;

    if (renewal && paymentStatus === "success") {
      const newPaidAmount =
        Number(renewalData.paidAmount) + Number(amount);

      const newRemainingAmount =
        Number(renewalData.amount) - newPaidAmount;

      renewalData.paidAmount = newPaidAmount;

      renewalData.remainingAmount = Math.max(
        0,
        newRemainingAmount,
      );

      // --------------------------------------------------
      // PARTIAL PAYMENT
      // --------------------------------------------------

      if (renewalData.remainingAmount > 0) {
        renewalData.paymentStatus = "partial";

        if (renewalData.status === "pending") {
          renewalData.status = "approved";
        }
      }

      // --------------------------------------------------
      // FULL PAYMENT
      // --------------------------------------------------

      if (renewalData.remainingAmount === 0) {
        renewalData.paymentStatus = "paid";

        renewalData.status = "completed";

        renewalData.processedBy =
          req.user?._id || req.user?.id || null;

        renewalData.processedAt = new Date();

        renewalCompleted = true;

        /*
         * Create new membership only after
         * renewal has been fully paid.
         */

        const previousMembership = await Membership.findById(
          renewalData.previousMembership,
        ).session(session);

        if (!previousMembership) {
          throw new Error("Previous membership not found");
        }

        // --------------------------------------------------
        // GENERATE UNIQUE MEMBERSHIP CODE
        // --------------------------------------------------

        let membershipCode =
          `${previousMembership.membershipCode}-R1`;

        let existingMembership = await Membership.findOne({
          membershipCode,
        }).session(session);

        let renewalSequence = 1;

        while (existingMembership) {
          renewalSequence += 1;

          membershipCode =
            `${previousMembership.membershipCode}-R${renewalSequence}`;

          existingMembership = await Membership.findOne({
            membershipCode,
          }).session(session);
        }

        // --------------------------------------------------
        // CREATE NEW MEMBERSHIP
        // --------------------------------------------------

        const newMembershipDocuments =
          await Membership.create(
            [
              {
                student: renewalData.student,

                academicSession:
                  renewalData.academicSession,

                membershipName:
                  previousMembership.membershipName,

                membershipCode,

                startDate: renewalData.startDate,

                endDate: renewalData.endDate,

                amount: renewalData.amount,

                status: "active",

                autoRenew:
                  previousMembership.autoRenew,

                notes:
                  `Created from renewal ${renewalData.renewalNumber}`,

                createdBy:
                  req.user?._id ||
                  req.user?.id ||
                  null,
              },
            ],
            { session },
          );

        newMembership = newMembershipDocuments[0];

        renewalData.newMembership = newMembership._id;
      }

      await renewalData.save({ session });
    }

    // ==================================================
    // COMMIT TRANSACTION
    // ==================================================

    await session.commitTransaction();

    // ==================================================
    // AUDIT LOG
    // ==================================================

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action: renewal
        ? renewalCompleted
          ? "PAYMENT_RENEWAL_COMPLETED"
          : "PAYMENT_RENEWAL_CREATE"
        : "PAYMENT_CREATE",

      entity: "Payment",

      entityId: payment._id,

      metadata: {
        paymentNumber: payment.paymentNumber,

        studentId: payment.student,

        academicSessionId: payment.academicSession,

        paymentTarget: renewal
          ? "renewal"
          : "fee_assignment",

        feeAssignmentId:
          payment.feeAssignment || null,

        renewalId:
          payment.renewal || null,

        amount: payment.amount,

        paymentMethod:
          payment.paymentMethod,

        paymentStatus:
          payment.paymentStatus,

        transactionId:
          payment.transactionId || "",

        paymentDate:
          payment.paymentDate,

        renewalCompleted,

        newMembershipId:
          newMembership?._id || null,
      },

      req,
    });

    // ==================================================
    // NOTIFICATION
    // ==================================================

    if (paymentStatus === "success") {
      try {
        const parentIds = Array.isArray(
          studentUser.parents,
        )
          ? studentUser.parents
          : [];

        if (parentIds.length > 0) {
          const studentName =
            `${studentUser.firstName || ""} ${
              studentUser.lastName || ""
            }`.trim();

          const notificationTitle =
            renewal
              ? renewalCompleted
                ? "Renewal Payment Successful"
                : "Renewal Payment Received"
              : "Payment Successful";

          const notificationMessage =
            renewal
              ? renewalCompleted
                ? `The renewal payment of ₹${Number(
                    amount,
                  ).toLocaleString(
                    "en-IN",
                  )} for ${studentName} has been completed successfully.`
                : `A renewal payment of ₹${Number(
                    amount,
                  ).toLocaleString(
                    "en-IN",
                  )} for ${studentName} has been received successfully.`
              : `A payment of ₹${Number(
                  amount,
                ).toLocaleString(
                  "en-IN",
                )} for ${studentName} has been received successfully.`;

          await createNotifications({
            recipients: parentIds,

            type: "payment_success",

            title: notificationTitle,

            message: notificationMessage,

            relatedEntity: "Payment",

            relatedEntityId: payment._id,

            metadata: {
              paymentNumber:
                payment.paymentNumber,

              studentId:
                payment.student,

              amount:
                payment.amount,

              paymentMethod:
                payment.paymentMethod,

              paymentTarget:
                renewal
                  ? "renewal"
                  : "fee_assignment",

              renewalCompleted,

              newMembershipId:
                newMembership?._id || null,
            },

            channels: ["in_app"],
          });
        }
      } catch (notificationError) {
        console.error(
          "Payment notification error:",
          notificationError.message,
        );
      }
    }

    // ==================================================
    // POPULATE AFTER COMMIT
    // ==================================================

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "student",
          "firstName lastName email phone userId",
        )
        .populate(
          "academicSession",
          "name code",
        )
        .populate("feeAssignment")
        .populate("renewal")
        .populate(
          "receivedBy",
          "firstName lastName email",
        );

    return res.status(201).json({
      success: true,

      message:
        paymentStatus === "success"
          ? "Payment recorded successfully"
          : "Payment record created successfully",

      data: populatedPayment,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Create payment error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create payment",
      code: "PAYMENT_CREATE_FAILED",
    });
  } finally {
    await session.endSession();
  }
};

// ==================================================
// GET ALL PAYMENTS
// ==================================================

const getPayments = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      feeAssignment,
      renewal,
      paymentStatus,
      paymentMethod,
      fromDate,
      toDate,
    } = req.query;

    const filter = {};

    if (student) {
      filter.student = student;
    }

    if (academicSession) {
      filter.academicSession = academicSession;
    }

    if (feeAssignment) {
      filter.feeAssignment = feeAssignment;
    }

    if (renewal) {
      filter.renewal = renewal;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(
          23,
          59,
          59,
          999,
        );

        filter.paymentDate.$lte = endDate;
      }
    }

    const payments = await Payment.find(filter)
      .populate(
        "student",
        "firstName lastName email phone userId",
      )
      .populate(
        "academicSession",
        "name code",
      )
      .populate("feeAssignment")
      .populate("renewal")
      .populate(
        "receivedBy",
        "firstName lastName email",
      )
      .sort({
        paymentDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error(
      "Get payments error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      code: "PAYMENTS_FETCH_FAILED",
    });
  }
};

// ==================================================
// GET PAYMENT BY ID
// ==================================================

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(
      req.params.id,
    )
      .populate(
        "student",
        "firstName lastName email phone userId",
      )
      .populate(
        "academicSession",
        "name code",
      )
      .populate("feeAssignment")
      .populate("renewal")
      .populate(
        "receivedBy",
        "firstName lastName email",
      );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
        code: "PAYMENT_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error(
      "Get payment error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      code: "PAYMENT_FETCH_FAILED",
    });
  }
};

// ==================================================
// GET PAYMENTS BY FEE ASSIGNMENT
// ==================================================

const getPaymentsByFeeAssignment = async (
  req,
  res,
) => {
  try {
    const payments = await Payment.find({
      feeAssignment:
        req.params.feeAssignmentId,
    })
      .populate(
        "student",
        "firstName lastName email phone userId",
      )
      .populate(
        "academicSession",
        "name code",
      )
      .populate(
        "receivedBy",
        "firstName lastName email",
      )
      .sort({
        paymentDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      message:
        "Fee assignment payment history fetched successfully",
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error(
      "Get fee assignment payments error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch payment history",
      code:
        "PAYMENT_HISTORY_FETCH_FAILED",
    });
  }
};

// ==================================================
// GET PAYMENTS BY RENEWAL
// ==================================================

const getPaymentsByRenewal = async (
  req,
  res,
) => {
  try {
    const payments = await Payment.find({
      renewal:
        req.params.renewalId,
    })
      .populate(
        "student",
        "firstName lastName email phone userId",
      )
      .populate(
        "academicSession",
        "name code",
      )
      .populate("renewal")
      .populate(
        "receivedBy",
        "firstName lastName email",
      )
      .sort({
        paymentDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      message:
        "Renewal payment history fetched successfully",
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error(
      "Get renewal payments error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch renewal payment history",
      code:
        "RENEWAL_PAYMENT_HISTORY_FETCH_FAILED",
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByFeeAssignment,
  getPaymentsByRenewal,
};