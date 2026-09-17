const mongoose = require("mongoose");

const Renewal = require("../models/Renewal");
const Membership = require("../models/Membership");
const User = require("../models/User");
const AcademicSession = require("../models/AcademicSession");

const { createAuditLog } = require("../services/auditLogService");

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const RENEWAL_STATUSES = [
  "pending",
  "approved",
  "completed",
  "cancelled",
  "rejected",
];

const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "failed",
  "cancelled",
];

const MAX_PAGE_LIMIT = 100;

// --------------------------------------------------
// GENERATE RENEWAL NUMBER
// --------------------------------------------------

const generateRenewalNumber = async () => {
  const year = new Date().getFullYear();

  const lastRenewal = await Renewal.findOne({
    renewalNumber: new RegExp(`^RENEWAL-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("renewalNumber");

  let nextNumber = 1;

  if (lastRenewal?.renewalNumber) {
    const parts = lastRenewal.renewalNumber.split("-");
    const lastNumber = Number(parts[2]);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `RENEWAL-${year}-${String(nextNumber).padStart(6, "0")}`;
};

// --------------------------------------------------
// CREATE RENEWAL
// --------------------------------------------------

const createRenewal = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      previousMembership,
      startDate,
      endDate,
      amount,
      notes = "",
    } = req.body;

    // --------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------

    if (
      !student ||
      !academicSession ||
      !previousMembership ||
      !startDate ||
      !endDate ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "student, academicSession, previousMembership, startDate, endDate and amount are required",
        errors: [],
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    // --------------------------------------------------
    // VALIDATE OBJECT IDS
    // --------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(student) ||
      !mongoose.Types.ObjectId.isValid(academicSession) ||
      !mongoose.Types.ObjectId.isValid(previousMembership)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student, academic session or membership ID",
        errors: [],
        code: "INVALID_REFERENCE_ID",
      });
    }

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    const renewalAmount = Number(amount);

    if (
      !Number.isFinite(renewalAmount) ||
      renewalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than zero",
        errors: [],
        code: "INVALID_AMOUNT",
      });
    }

    // --------------------------------------------------
    // VALIDATE DATES
    // --------------------------------------------------

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date or end date",
        errors: [],
        code: "INVALID_DATE",
      });
    }

    if (parsedEndDate <= parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
        errors: [],
        code: "INVALID_DATE_RANGE",
      });
    }

    // --------------------------------------------------
    // VALIDATE STUDENT
    // --------------------------------------------------

    const studentUser = await User.findById(student).select(
      "firstName lastName email phone userId role status"
    );

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
        errors: [],
        code: "STUDENT_NOT_FOUND",
      });
    }

    if (studentUser.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a student",
        errors: [],
        code: "INVALID_STUDENT_ROLE",
      });
    }

    // --------------------------------------------------
    // VALIDATE ACADEMIC SESSION
    // --------------------------------------------------

    const session = await AcademicSession.findById(
      academicSession
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        errors: [],
        code: "ACADEMIC_SESSION_NOT_FOUND",
      });
    }

    // --------------------------------------------------
    // VALIDATE PREVIOUS MEMBERSHIP
    // --------------------------------------------------

    const membership = await Membership.findById(
      previousMembership
    );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Previous membership not found",
        errors: [],
        code: "MEMBERSHIP_NOT_FOUND",
      });
    }

    if (
      String(membership.student) !== String(student)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership does not belong to selected student",
        errors: [],
        code: "MEMBERSHIP_STUDENT_MISMATCH",
      });
    }

    if (
      String(membership.academicSession) !==
      String(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership does not belong to selected academic session",
        errors: [],
        code: "MEMBERSHIP_SESSION_MISMATCH",
      });
    }

    if (membership.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled membership cannot be renewed",
        errors: [],
        code: "CANCELLED_MEMBERSHIP",
      });
    }

    if (membership.status === "suspended") {
      return res.status(400).json({
        success: false,
        message: "Suspended membership cannot be renewed",
        errors: [],
        code: "SUSPENDED_MEMBERSHIP",
      });
    }

    // --------------------------------------------------
    // DUPLICATE PENDING / APPROVED RENEWAL
    // --------------------------------------------------

    const existingPendingRenewal = await Renewal.findOne({
      student,
      previousMembership,
      status: {
        $in: ["pending", "approved"],
      },
    }).select("_id renewalNumber status");

    if (existingPendingRenewal) {
      return res.status(409).json({
        success: false,
        message:
          "A renewal is already pending or approved for this membership",
        errors: [],
        code: "RENEWAL_ALREADY_EXISTS",
        data: {
          renewalId: existingPendingRenewal._id,
          renewalNumber:
            existingPendingRenewal.renewalNumber,
          status: existingPendingRenewal.status,
        },
      });
    }

    // --------------------------------------------------
    // GENERATE RENEWAL NUMBER
    // --------------------------------------------------

    const renewalNumber = await generateRenewalNumber();

    // --------------------------------------------------
    // CREATE RENEWAL
    // --------------------------------------------------

    const renewal = await Renewal.create({
      student,
      academicSession,
      previousMembership,

      renewalNumber,

      renewalDate: new Date(),

      startDate: parsedStartDate,
      endDate: parsedEndDate,

      amount: renewalAmount,

      paidAmount: 0,
      remainingAmount: renewalAmount,

      paymentStatus: "pending",
      status: "pending",

      notes: String(notes).trim(),

      processedBy: null,
      processedAt: null,

      newMembership: null,
      cancellationReason: "",
    });

    // --------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------

    await createAuditLog({
      userId: req.user?._id || req.user?.id || null,
      action: "RENEWAL_CREATE",
      entity: "Renewal",
      entityId: renewal._id,

      metadata: {
        renewalNumber: renewal.renewalNumber,
        studentId: renewal.student,
        academicSessionId: renewal.academicSession,
        previousMembershipId:
          renewal.previousMembership,

        startDate: renewal.startDate,
        endDate: renewal.endDate,

        amount: renewal.amount,
        paidAmount: renewal.paidAmount,
        remainingAmount:
          renewal.remainingAmount,

        paymentStatus:
          renewal.paymentStatus,
        status: renewal.status,
      },

      req,
    });

    // --------------------------------------------------
    // POPULATE RESPONSE
    // --------------------------------------------------

    const populatedRenewal =
      await Renewal.findById(renewal._id)
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "previousMembership",
          "membershipName membershipCode startDate endDate amount status"
        );

    return res.status(201).json({
      success: true,
      message: "Renewal created successfully",
      data: populatedRenewal,
    });
  } catch (error) {
    console.error("Create renewal error:", error);

    // Duplicate renewal number protection
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Renewal number already exists. Please retry the request.",
        errors: [],
        code: "DUPLICATE_RENEWAL_NUMBER",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create renewal",
      errors: [],
      code: "CREATE_RENEWAL_FAILED",
    });
  }
};

// --------------------------------------------------
// GET ALL RENEWALS
// --------------------------------------------------

const getRenewals = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      previousMembership,
      status,
      paymentStatus,
    } = req.query;

    // --------------------------------------------------
    // PAGINATION
    // --------------------------------------------------

    const pageNumber = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 20;

    const page = Math.max(1, pageNumber);
    const limit = Math.min(
      Math.max(1, requestedLimit),
      MAX_PAGE_LIMIT
    );

    const skip = (page - 1) * limit;

    const filter = {};

    // --------------------------------------------------
    // STUDENT FILTER
    // --------------------------------------------------

    if (student) {
      if (!mongoose.Types.ObjectId.isValid(student)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
          errors: [],
          code: "INVALID_STUDENT_ID",
        });
      }

      filter.student = student;
    }

    // --------------------------------------------------
    // ACADEMIC SESSION FILTER
    // --------------------------------------------------

    if (academicSession) {
      if (
        !mongoose.Types.ObjectId.isValid(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID",
          errors: [],
          code: "INVALID_ACADEMIC_SESSION_ID",
        });
      }

      filter.academicSession = academicSession;
    }

    // --------------------------------------------------
    // MEMBERSHIP FILTER
    // --------------------------------------------------

    if (previousMembership) {
      if (
        !mongoose.Types.ObjectId.isValid(
          previousMembership
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid membership ID",
          errors: [],
          code: "INVALID_MEMBERSHIP_ID",
        });
      }

      filter.previousMembership =
        previousMembership;
    }

    // --------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------

    if (status) {
      if (!RENEWAL_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid renewal status",
          errors: [],
          code: "INVALID_RENEWAL_STATUS",
        });
      }

      filter.status = status;
    }

    // --------------------------------------------------
    // PAYMENT STATUS FILTER
    // --------------------------------------------------

    if (paymentStatus) {
      if (
        !PAYMENT_STATUSES.includes(paymentStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
          errors: [],
          code: "INVALID_PAYMENT_STATUS",
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    // --------------------------------------------------
    // FETCH DATA + TOTAL
    // --------------------------------------------------

    const [renewals, total] = await Promise.all([
      Renewal.find(filter)
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "previousMembership",
          "membershipName membershipCode startDate endDate amount status"
        )
        .populate(
          "newMembership",
          "membershipName membershipCode startDate endDate amount status"
        )
        .populate(
          "processedBy",
          "firstName lastName email userId role"
        )
        .sort({
          renewalDate: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Renewal.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Renewals fetched successfully",
      data: renewals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get renewals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch renewals",
      errors: [],
      code: "GET_RENEWALS_FAILED",
    });
  }
};

// --------------------------------------------------
// GET RENEWAL BY ID
// --------------------------------------------------

const getRenewalById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal ID",
        errors: [],
        code: "INVALID_RENEWAL_ID",
      });
    }

    const renewal = await Renewal.findById(id)
      .populate(
        "student",
        "firstName lastName email phone userId status"
      )
      .populate(
        "academicSession",
        "name code startDate endDate status"
      )
      .populate(
        "previousMembership",
        "membershipName membershipCode startDate endDate amount status"
      )
      .populate(
        "newMembership",
        "membershipName membershipCode startDate endDate amount status"
      )
      .populate(
        "processedBy",
        "firstName lastName email userId role"
      );

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Renewal not found",
        errors: [],
        code: "RENEWAL_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Renewal fetched successfully",
      data: renewal,
    });
  } catch (error) {
    console.error(
      "Get renewal by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch renewal",
      errors: [],
      code: "GET_RENEWAL_FAILED",
    });
  }
};

// --------------------------------------------------
// UPDATE RENEWAL
// --------------------------------------------------

const updateRenewal = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      startDate,
      endDate,
      amount,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal ID",
        errors: [],
        code: "INVALID_RENEWAL_ID",
      });
    }

    const renewal = await Renewal.findById(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Renewal not found",
        errors: [],
        code: "RENEWAL_NOT_FOUND",
      });
    }

    // --------------------------------------------------
    // STATUS PROTECTION
    // --------------------------------------------------

    if (renewal.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled renewal cannot be updated",
        errors: [],
        code: "RENEWAL_ALREADY_CANCELLED",
      });
    }

    if (renewal.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Completed renewal cannot be updated",
        errors: [],
        code: "RENEWAL_ALREADY_COMPLETED",
      });
    }

    // --------------------------------------------------
    // CAPTURE PREVIOUS VALUES
    // --------------------------------------------------

    const previousValues = {
      startDate: renewal.startDate,
      endDate: renewal.endDate,
      amount: renewal.amount,
      paidAmount: renewal.paidAmount,
      remainingAmount:
        renewal.remainingAmount,
      paymentStatus:
        renewal.paymentStatus,
      status: renewal.status,
      notes: renewal.notes,
    };

    // --------------------------------------------------
    // UPDATE START DATE
    // --------------------------------------------------

    if (startDate !== undefined) {
      const parsedStartDate =
        new Date(startDate);

      if (
        Number.isNaN(
          parsedStartDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
          errors: [],
          code: "INVALID_START_DATE",
        });
      }

      renewal.startDate =
        parsedStartDate;
    }

    // --------------------------------------------------
    // UPDATE END DATE
    // --------------------------------------------------

    if (endDate !== undefined) {
      const parsedEndDate =
        new Date(endDate);

      if (
        Number.isNaN(
          parsedEndDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date",
          errors: [],
          code: "INVALID_END_DATE",
        });
      }

      renewal.endDate =
        parsedEndDate;
    }

    // --------------------------------------------------
    // DATE RANGE VALIDATION
    // --------------------------------------------------

    if (
      renewal.endDate <=
      renewal.startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End date must be after start date",
        errors: [],
        code: "INVALID_DATE_RANGE",
      });
    }

    // --------------------------------------------------
    // UPDATE AMOUNT
    // --------------------------------------------------

    if (amount !== undefined) {
      const renewalAmount =
        Number(amount);

      if (
        !Number.isFinite(
          renewalAmount
        ) ||
        renewalAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be a valid number greater than zero",
          errors: [],
          code: "INVALID_AMOUNT",
        });
      }

      // Amount cannot be lower than
      // already paid amount.
      if (
        renewalAmount <
        Number(renewal.paidAmount || 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount cannot be less than already paid amount",
          errors: [],
          code: "AMOUNT_LESS_THAN_PAID",
        });
      }

      renewal.amount =
        renewalAmount;

      renewal.remainingAmount =
        Math.max(
          0,
          renewalAmount -
            Number(
              renewal.paidAmount || 0
            )
        );

      // --------------------------------------------------
      // RECALCULATE PAYMENT STATUS
      // --------------------------------------------------

      if (
        renewal.remainingAmount === 0
      ) {
        renewal.paymentStatus =
          "paid";
      } else if (
        Number(
          renewal.paidAmount || 0
        ) > 0
      ) {
        renewal.paymentStatus =
          "partial";
      } else {
        renewal.paymentStatus =
          "pending";
      }
    }

    // --------------------------------------------------
    // UPDATE NOTES
    // --------------------------------------------------

    if (notes !== undefined) {
      renewal.notes =
        String(notes).trim();
    }

    await renewal.save();

    // --------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action: "RENEWAL_UPDATE",

      entity: "Renewal",

      entityId: renewal._id,

      metadata: {
        renewalNumber:
          renewal.renewalNumber,

        studentId:
          renewal.student,

        academicSessionId:
          renewal.academicSession,

        previousMembershipId:
          renewal.previousMembership,

        previous: previousValues,

        updated: {
          startDate:
            renewal.startDate,

          endDate:
            renewal.endDate,

          amount:
            renewal.amount,

          paidAmount:
            renewal.paidAmount,

          remainingAmount:
            renewal.remainingAmount,

          paymentStatus:
            renewal.paymentStatus,

          status:
            renewal.status,

          notes:
            renewal.notes,
        },
      },

      req,
    });

    // --------------------------------------------------
    // POPULATE RESPONSE
    // --------------------------------------------------

    const updatedRenewal =
      await Renewal.findById(
        renewal._id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "previousMembership",
          "membershipName membershipCode startDate endDate amount status"
        )
        .populate(
          "newMembership",
          "membershipName membershipCode startDate endDate amount status"
        );

    return res.status(200).json({
      success: true,
      message: "Renewal updated successfully",
      data: updatedRenewal,
    });
  } catch (error) {
    console.error(
      "Update renewal error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update renewal",
      errors: [],
      code: "UPDATE_RENEWAL_FAILED",
    });
  }
};

// --------------------------------------------------
// CANCEL RENEWAL
// --------------------------------------------------

const cancelRenewal = async (req, res) => {
  try {
    const { id } = req.params;

    const cancellationReason =
      String(
        req.body?.cancellationReason || ""
      ).trim();

    // --------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal ID",
        errors: [],
        code: "INVALID_RENEWAL_ID",
      });
    }

    // --------------------------------------------------
    // CANCELLATION REASON REQUIRED
    // --------------------------------------------------

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason is required",
        errors: [],
        code:
          "CANCELLATION_REASON_REQUIRED",
      });
    }

    if (cancellationReason.length > 500) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason cannot exceed 500 characters",
        errors: [],
        code:
          "CANCELLATION_REASON_TOO_LONG",
      });
    }

    // --------------------------------------------------
    // FIND RENEWAL
    // --------------------------------------------------

    const renewal =
      await Renewal.findById(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Renewal not found",
        errors: [],
        code: "RENEWAL_NOT_FOUND",
      });
    }

    // --------------------------------------------------
    // STATUS PROTECTION
    // --------------------------------------------------

    if (renewal.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Completed renewal cannot be cancelled",
        errors: [],
        code:
          "RENEWAL_ALREADY_COMPLETED",
      });
    }

    if (renewal.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Renewal is already cancelled",
        errors: [],
        code:
          "RENEWAL_ALREADY_CANCELLED",
      });
    }

    // --------------------------------------------------
    // CAPTURE PREVIOUS VALUES
    // --------------------------------------------------

    const previousValues = {
      status: renewal.status,
      paymentStatus:
        renewal.paymentStatus,
      paidAmount:
        renewal.paidAmount,
      remainingAmount:
        renewal.remainingAmount,
      cancellationReason:
        renewal.cancellationReason,
    };

    // --------------------------------------------------
    // CANCEL RENEWAL
    // --------------------------------------------------

    renewal.status =
      "cancelled";

    renewal.paymentStatus =
      "cancelled";

    renewal.cancellationReason =
      cancellationReason;

    await renewal.save();

    // --------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action: "RENEWAL_CANCEL",

      entity: "Renewal",

      entityId: renewal._id,

      metadata: {
        renewalNumber:
          renewal.renewalNumber,

        studentId:
          renewal.student,

        academicSessionId:
          renewal.academicSession,

        previousMembershipId:
          renewal.previousMembership,

        previous: previousValues,

        updated: {
          status:
            renewal.status,

          paymentStatus:
            renewal.paymentStatus,

          paidAmount:
            renewal.paidAmount,

          remainingAmount:
            renewal.remainingAmount,

          cancellationReason:
            renewal.cancellationReason,
        },
      },

      req,
    });

    // --------------------------------------------------
    // POPULATE RESPONSE
    // --------------------------------------------------

    const updatedRenewal =
      await Renewal.findById(
        renewal._id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "previousMembership",
          "membershipName membershipCode startDate endDate amount status"
        )
        .populate(
          "newMembership",
          "membershipName membershipCode startDate endDate amount status"
        );

    return res.status(200).json({
      success: true,
      message:
        "Renewal cancelled successfully",
      data: updatedRenewal,
    });
  } catch (error) {
    console.error(
      "Cancel renewal error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to cancel renewal",
      errors: [],
      code:
        "CANCEL_RENEWAL_FAILED",
    });
  }
};


const approveRenewal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal ID",
        errors: [],
      });
    }

    const renewal = await Renewal.findById(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Renewal not found",
        errors: [],
      });
    }

    if (renewal.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed renewal cannot be approved",
        errors: [],
      });
    }

    if (renewal.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled renewal cannot be approved",
        errors: [],
      });
    }

    if (renewal.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Rejected renewal cannot be approved",
        errors: [],
      });
    }

    if (renewal.status === "approved") {
      const existing = await Renewal.findById(id)
        .populate("student", "firstName lastName email phone userId")
        .populate("academicSession", "name code")
        .populate("previousMembership")
        .populate("newMembership")
        .populate("processedBy", "firstName lastName email");

      return res.status(200).json({
        success: true,
        message: "Renewal is already approved",
        data: existing,
      });
    }

    renewal.status = "approved";

    await renewal.save();

    await createAuditLog({
      userId: req.user?._id || null,
      action: "RENEWAL_APPROVE",
      entity: "Renewal",
      entityId: renewal._id,
      metadata: {
        renewalNumber: renewal.renewalNumber,
        student: renewal.student,
      },
      req,
    });

    const updatedRenewal = await Renewal.findById(id)
      .populate("student", "firstName lastName email phone userId")
      .populate("academicSession", "name code")
      .populate("previousMembership")
      .populate("newMembership")
      .populate("processedBy", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "Renewal approved successfully",
      data: updatedRenewal,
    });
  } catch (error) {
    console.error("Approve renewal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve renewal",
      errors: [],
    });
  }
};


const completeRenewal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal ID",
        errors: [],
      });
    }

    const actorId = req.user?._id || req.user?.id;

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user is required",
        errors: [],
      });
    }

    const renewal = await Renewal.findById(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Renewal not found",
        errors: [],
      });
    }

    // Idempotent completion
    if (renewal.status === "completed") {
      const existing = await Renewal.findById(id)
        .populate("student", "firstName lastName email phone userId")
        .populate("academicSession", "name code")
        .populate("previousMembership")
        .populate("newMembership")
        .populate("processedBy", "firstName lastName email");

      return res.status(200).json({
        success: true,
        message: "Renewal is already completed",
        data: existing,
      });
    }

    if (renewal.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled renewal cannot be completed",
        errors: [],
      });
    }

    if (renewal.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Rejected renewal cannot be completed",
        errors: [],
      });
    }

    // Payment must be fully paid
    if (
      renewal.paymentStatus !== "paid" ||
      Number(renewal.paidAmount) < Number(renewal.amount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Renewal payment is not fully paid",
        errors: [],
      });
    }

    const previousMembership = await Membership.findById(
      renewal.previousMembership
    );

    if (!previousMembership) {
      return res.status(404).json({
        success: false,
        message: "Previous membership not found",
        errors: [],
      });
    }

    if (
      previousMembership.status === "cancelled" ||
      previousMembership.status === "suspended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Renewal cannot be completed because previous membership is cancelled or suspended",
        errors: [],
      });
    }

    let newMembership = null;

    // If membership was already created by payment flow,
    // reuse it instead of creating duplicate membership.
    if (renewal.newMembership) {
      newMembership = await Membership.findById(
        renewal.newMembership
      );
    }

    // Otherwise create the new membership.
    if (!newMembership) {
      const membershipCode = `RENEWAL-${renewal.renewalNumber}`;

      newMembership = await Membership.findOne({
        membershipCode,
      });

      if (!newMembership) {
        const startDate = new Date(renewal.startDate);
        const endDate = new Date(renewal.endDate);
        const now = new Date();

        let membershipStatus = "active";

        if (now > endDate) {
          membershipStatus = "expired";
        } else {
          const remainingDays = Math.ceil(
            (endDate - now) / (1000 * 60 * 60 * 24)
          );

          if (remainingDays <= 30) {
            membershipStatus = "expiring";
          }
        }

        newMembership = await Membership.create({
          student: renewal.student,
          academicSession: renewal.academicSession,

          membershipName:
            previousMembership.membershipName ||
            "Membership Renewal",

          membershipCode,

          startDate,
          endDate,

          amount: renewal.amount,

          status: membershipStatus,

          autoRenew:
            previousMembership.autoRenew === true,

          notes:
            renewal.notes ||
            `Created from renewal ${renewal.renewalNumber}`,

          createdBy: actorId,
        });
      }
    }

    renewal.newMembership = newMembership._id;
    renewal.status = "completed";
    renewal.paymentStatus = "paid";
    renewal.remainingAmount = 0;
    renewal.processedBy = actorId;
    renewal.processedAt = new Date();

    await renewal.save();

    await createAuditLog({
      userId: actorId,
      action: "RENEWAL_COMPLETE",
      entity: "Renewal",
      entityId: renewal._id,
      metadata: {
        renewalNumber: renewal.renewalNumber,
        student: renewal.student,
        newMembership: newMembership._id,
      },
      req,
    });

    const completedRenewal = await Renewal.findById(id)
      .populate("student", "firstName lastName email phone userId")
      .populate("academicSession", "name code")
      .populate("previousMembership")
      .populate("newMembership")
      .populate("processedBy", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "Renewal completed successfully",
      data: completedRenewal,
    });
  } catch (error) {
    console.error("Complete renewal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete renewal",
      errors: [],
    });
  }
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  createRenewal,
  getRenewals,
  getRenewalById,
  updateRenewal,
  cancelRenewal,
  approveRenewal,
  completeRenewal,
};