const mongoose = require("mongoose");

const Membership = require("../models/Membership");
const Enrollment = require("../models/Enrollment");
const FeeStructure = require("../models/FeeStructure");
const FeeAssignment = require("../models/FeeAssignment");
const User = require("../models/User");

const {
  createAuditLog,
} = require("../services/auditLogService");

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const MEMBERSHIP_STATUSES = [
  "pending",
  "active",
  "expiring",
  "expired",
  "suspended",
  "cancelled",
];

const MAX_PAGE_LIMIT = 100;

// --------------------------------------------------
// MEMBERSHIP STATUS
// --------------------------------------------------

const getMembershipStatus = (
  startDate,
  endDate,
  currentStatus = "pending"
) => {
  if (
    currentStatus === "cancelled" ||
    currentStatus === "suspended"
  ) {
    return currentStatus;
  }

  if (currentStatus === "pending") {
    return "pending";
  }

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return "active";
  }

  if (now > end) {
    return "expired";
  }

  const remainingDays = Math.ceil(
    (end - now) / (1000 * 60 * 60 * 24)
  );

  if (remainingDays <= 30) {
    return "expiring";
  }

  return "active";
};

// --------------------------------------------------
// GENERATE MEMBERSHIP CODE
// --------------------------------------------------

const generateMembershipCode = async (
  feeStructure,
  academicSession
) => {
  const year = new Date().getFullYear();

  const programCode =
    feeStructure?.program?.code ||
    "MEM";

  const safeProgramCode = String(programCode)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

  const prefix = `MEM-${safeProgramCode}-${year}-`;

  const lastMembership = await Membership.findOne({
    membershipCode: new RegExp(`^${prefix}`),
  })
    .sort({
      membershipCode: -1,
    })
    .select("membershipCode");

  let nextNumber = 1;

  if (lastMembership?.membershipCode) {
    const parts =
      lastMembership.membershipCode.split("-");

    const lastNumber = Number(parts[parts.length - 1]);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

// --------------------------------------------------
// CREATE MEMBERSHIP
// --------------------------------------------------

const createMembership = async (req, res) => {
  try {
    const {
      enrollment,
      feeStructure,
      startDate,
      endDate,
      autoRenew = false,
      notes = "",
    } = req.body;

    // --------------------------------------------------
    // REQUIRED
    // --------------------------------------------------

    if (
      !enrollment ||
      !feeStructure ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "enrollment, feeStructure, startDate and endDate are required",
        errors: [],
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    // --------------------------------------------------
    // OBJECT ID VALIDATION
    // --------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(enrollment) ||
      !mongoose.Types.ObjectId.isValid(feeStructure)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid enrollment or fee structure ID",
        errors: [],
        code: "INVALID_REFERENCE_ID",
      });
    }

    // --------------------------------------------------
    // DATE VALIDATION
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
        message:
          "End date must be after start date",
        errors: [],
        code: "INVALID_DATE_RANGE",
      });
    }

    // --------------------------------------------------
    // ENROLLMENT
    // --------------------------------------------------

    const enrollmentRecord =
      await Enrollment.findById(enrollment)
        .populate(
          "student",
          "firstName lastName email phone userId role status"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "program",
          "name code duration status"
        )
        .populate(
          "class",
          "name code status"
        )
        .populate(
          "section",
          "name code status"
        );

    if (!enrollmentRecord) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
        errors: [],
        code: "ENROLLMENT_NOT_FOUND",
      });
    }

    if (enrollmentRecord.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Membership can only be created for an active enrollment",
        errors: [],
        code: "ENROLLMENT_NOT_ACTIVE",
      });
    }

    const student =
      enrollmentRecord.student;

    if (!student) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment student could not be resolved",
        errors: [],
        code: "ENROLLMENT_STUDENT_NOT_FOUND",
      });
    }

    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment does not belong to a student",
        errors: [],
        code: "INVALID_STUDENT_ROLE",
      });
    }

    // --------------------------------------------------
    // FEE STRUCTURE
    // --------------------------------------------------

    const feeStructureRecord =
      await FeeStructure.findById(
        feeStructure
      )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "program",
          "name code duration status"
        )
        .populate(
          "class",
          "name code status"
        );

    if (!feeStructureRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
        errors: [],
        code: "FEE_STRUCTURE_NOT_FOUND",
      });
    }

    if (
      feeStructureRecord.status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Inactive fee structure cannot be used",
        errors: [],
        code: "FEE_STRUCTURE_INACTIVE",
      });
    }

    // --------------------------------------------------
    // SESSION MATCH
    // --------------------------------------------------

    if (
      String(
        enrollmentRecord.academicSession._id
      ) !==
      String(feeStructureRecord.academicSession._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure does not belong to the enrollment academic session",
        errors: [],
        code: "SESSION_MISMATCH",
      });
    }

    // --------------------------------------------------
    // PROGRAM MATCH
    // --------------------------------------------------

    if (
      String(
        enrollmentRecord.program._id
      ) !==
      String(feeStructureRecord.program._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure does not belong to the enrollment program",
        errors: [],
        code: "PROGRAM_MISMATCH",
      });
    }

    // --------------------------------------------------
    // CLASS MATCH
    // --------------------------------------------------

    if (
      feeStructureRecord.class &&
      String(
        enrollmentRecord.class._id
      ) !==
      String(feeStructureRecord.class._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure does not belong to the enrollment class",
        errors: [],
        code: "CLASS_MISMATCH",
      });
    }

    // --------------------------------------------------
    // AMOUNT SNAPSHOT
    // --------------------------------------------------

    const membershipAmount = Number(
      feeStructureRecord.amount
    );

    if (
      !Number.isFinite(membershipAmount) ||
      membershipAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure has an invalid amount",
        errors: [],
        code: "INVALID_FEE_STRUCTURE_AMOUNT",
      });
    }

    // --------------------------------------------------
    // DUPLICATE ACTIVE/PENDING MEMBERSHIP
    // --------------------------------------------------

    const existingMembership =
      await Membership.findOne({
        enrollment: enrollmentRecord._id,
        feeStructure: feeStructureRecord._id,
        status: {
          $in: [
            "pending",
            "active",
            "expiring",
          ],
        },
      }).select(
        "_id membershipCode membershipName status amount"
      );

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message:
          "A membership already exists for this enrollment and fee structure",
        errors: [],
        code: "MEMBERSHIP_ALREADY_EXISTS",
        data: existingMembership,
      });
    }

    // --------------------------------------------------
    // GENERATE CODE
    // --------------------------------------------------

    const membershipCode =
      await generateMembershipCode(
        feeStructureRecord,
        enrollmentRecord.academicSession
      );

    // --------------------------------------------------
    // MEMBERSHIP NAME
    // --------------------------------------------------

    const membershipName =
      feeStructureRecord.name;

    // --------------------------------------------------
    // CREATE MEMBERSHIP
    // --------------------------------------------------

    const membership =
      await Membership.create({
        student: student._id,

        enrollment:
          enrollmentRecord._id,

        academicSession:
          enrollmentRecord.academicSession._id,

        feeStructure:
          feeStructureRecord._id,

        feeAssignment: null,

        membershipName,

        membershipCode,

        startDate: parsedStartDate,

        endDate: parsedEndDate,

        amount: membershipAmount,

        // Membership becomes active after
        // successful payment.
        status: "pending",

        autoRenew:
          Boolean(autoRenew),

        notes:
          String(notes).trim(),

        createdBy:
          req.user?._id ||
          req.user?.id ||
          null,
      });

    // --------------------------------------------------
    // AUDIT
    // --------------------------------------------------

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action: "MEMBERSHIP_CREATE",

      entity: "Membership",

      entityId: membership._id,

      metadata: {
        membershipCode:
          membership.membershipCode,

        studentId:
          membership.student,

        enrollmentId:
          membership.enrollment,

        academicSessionId:
          membership.academicSession,

        feeStructureId:
          membership.feeStructure,

        amount:
          membership.amount,

        status:
          membership.status,
      },

      req,
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    const populatedMembership =
      await Membership.findById(
        membership._id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "enrollment"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "feeStructure"
        )
        .populate(
          "feeAssignment"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        );

    return res.status(201).json({
      success: true,
      message:
        "Membership created successfully",
      data: populatedMembership,
    });
  } catch (error) {
    console.error(
      "Create membership error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Membership code or membership already exists",
        errors: [],
        code: "DUPLICATE_MEMBERSHIP",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create membership",
      errors: [],
      code: "CREATE_MEMBERSHIP_FAILED",
    });
  }
};

// --------------------------------------------------
// GET MEMBERSHIPS
// --------------------------------------------------

const getMemberships = async (req, res) => {
  try {
    const {
      student,
      enrollment,
      academicSession,
      feeStructure,
      status,
      autoRenew,
    } = req.query;

    const pageNumber =
      Number(req.query.page) || 1;

    const requestedLimit =
      Number(req.query.limit) || 20;

    const page = Math.max(
      1,
      pageNumber
    );

    const limit = Math.min(
      Math.max(1, requestedLimit),
      MAX_PAGE_LIMIT
    );

    const skip =
      (page - 1) * limit;

    const filter = {};

    if (student) {
      if (
        !mongoose.Types.ObjectId.isValid(
          student
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
          errors: [],
        });
      }

      filter.student = student;
    }

    if (enrollment) {
      if (
        !mongoose.Types.ObjectId.isValid(
          enrollment
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid enrollment ID",
          errors: [],
        });
      }

      filter.enrollment =
        enrollment;
    }

    if (academicSession) {
      if (
        !mongoose.Types.ObjectId.isValid(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID",
          errors: [],
        });
      }

      filter.academicSession =
        academicSession;
    }

    if (feeStructure) {
      if (
        !mongoose.Types.ObjectId.isValid(
          feeStructure
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fee structure ID",
          errors: [],
        });
      }

      filter.feeStructure =
        feeStructure;
    }

    if (status) {
      if (
        !MEMBERSHIP_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid membership status",
          errors: [],
        });
      }

      filter.status = status;
    }

    if (autoRenew !== undefined) {
      filter.autoRenew =
        autoRenew === "true";
    }

    const [
      memberships,
      total,
    ] = await Promise.all([
      Membership.find(filter)
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "enrollment"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "feeStructure"
        )
        .populate(
          "feeAssignment"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        )
        .populate(
          "cancelledBy",
          "firstName lastName email userId"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Membership.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Memberships fetched successfully",
      data: memberships,
      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Get memberships error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch memberships",
      errors: [],
    });
  }
};

// --------------------------------------------------
// GET MEMBERSHIP BY ID
// --------------------------------------------------

const getMembershipById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership ID",
        errors: [],
      });
    }

    const membership =
      await Membership.findById(
        id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "enrollment"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "feeStructure"
        )
        .populate(
          "feeAssignment"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        )
        .populate(
          "cancelledBy",
          "firstName lastName email userId"
        );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Membership fetched successfully",
      data: membership,
    });
  } catch (error) {
    console.error(
      "Get membership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch membership",
      errors: [],
    });
  }
};

// --------------------------------------------------
// UPDATE MEMBERSHIP
// --------------------------------------------------

const updateMembership = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const {
      startDate,
      endDate,
      autoRenew,
      notes,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership ID",
        errors: [],
      });
    }

    const membership =
      await Membership.findById(id);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
        errors: [],
      });
    }

    if (
      membership.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled membership cannot be updated",
        errors: [],
      });
    }

    if (
      membership.status ===
      "expired"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expired membership cannot be updated",
        errors: [],
      });
    }

    const previousValues = {
      startDate:
        membership.startDate,

      endDate:
        membership.endDate,

      autoRenew:
        membership.autoRenew,

      notes:
        membership.notes,

      amount:
        membership.amount,
    };

    if (
      startDate !== undefined
    ) {
      const parsed =
        new Date(startDate);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid start date",
          errors: [],
        });
      }

      membership.startDate =
        parsed;
    }

    if (
      endDate !== undefined
    ) {
      const parsed =
        new Date(endDate);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid end date",
          errors: [],
        });
      }

      membership.endDate =
        parsed;
    }

    if (
      membership.endDate <=
      membership.startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End date must be after start date",
        errors: [],
      });
    }

    if (
      autoRenew !== undefined
    ) {
      membership.autoRenew =
        Boolean(autoRenew);
    }

    if (
      notes !== undefined
    ) {
      membership.notes =
        String(notes).trim();
    }

    // Amount is intentionally NOT editable.
    membership.status =
      getMembershipStatus(
        membership.startDate,
        membership.endDate,
        membership.status
      );

    await membership.save();

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "MEMBERSHIP_UPDATE",

      entity:
        "Membership",

      entityId:
        membership._id,

      metadata: {
        membershipCode:
          membership.membershipCode,

        previous:
          previousValues,

        updated: {
          startDate:
            membership.startDate,

          endDate:
            membership.endDate,

          autoRenew:
            membership.autoRenew,

          notes:
            membership.notes,

          amount:
            membership.amount,

          status:
            membership.status,
        },
      },

      req,
    });

    const updated =
      await Membership.findById(
        membership._id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "enrollment"
        )
        .populate(
          "academicSession"
        )
        .populate(
          "feeStructure"
        )
        .populate(
          "feeAssignment"
        );

    return res.status(200).json({
      success: true,
      message:
        "Membership updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Update membership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update membership",
      errors: [],
    });
  }
};

// --------------------------------------------------
// SUSPEND
// --------------------------------------------------

const suspendMembership = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership ID",
        errors: [],
      });
    }

    const membership =
      await Membership.findById(id);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
        errors: [],
      });
    }

    if (
      membership.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled membership cannot be suspended",
        errors: [],
      });
    }

    if (
      membership.status ===
      "expired"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expired membership cannot be suspended",
        errors: [],
      });
    }

    if (
      membership.status ===
      "suspended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership is already suspended",
        errors: [],
      });
    }

    membership.status =
      "suspended";

    await membership.save();

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "MEMBERSHIP_SUSPEND",

      entity:
        "Membership",

      entityId:
        membership._id,

      metadata: {
        membershipCode:
          membership.membershipCode,

        student:
          membership.student,
      },

      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Membership suspended successfully",
      data: membership,
    });
  } catch (error) {
    console.error(
      "Suspend membership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to suspend membership",
      errors: [],
    });
  }
};

// --------------------------------------------------
// CANCEL
// --------------------------------------------------

const cancelMembership = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const cancellationReason =
      String(
        req.body?.cancellationReason ||
          ""
      ).trim();

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership ID",
        errors: [],
      });
    }

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason is required",
        errors: [],
      });
    }

    if (
      cancellationReason.length >
      500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason cannot exceed 500 characters",
        errors: [],
      });
    }

    const membership =
      await Membership.findById(id);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
        errors: [],
      });
    }

    if (
      membership.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership is already cancelled",
        errors: [],
      });
    }

    membership.status =
      "cancelled";

    membership.cancelledAt =
      new Date();

    membership.cancelledBy =
      req.user?._id ||
      req.user?.id ||
      null;

    membership.cancellationReason =
      cancellationReason;

    await membership.save();

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "MEMBERSHIP_CANCEL",

      entity:
        "Membership",

      entityId:
        membership._id,

      metadata: {
        membershipCode:
          membership.membershipCode,

        student:
          membership.student,

        cancellationReason,
      },

      req,
    });

    const updated =
      await Membership.findById(
        membership._id
      )
        .populate(
          "student",
          "firstName lastName email phone userId status"
        )
        .populate(
          "enrollment"
        )
        .populate(
          "academicSession"
        )
        .populate(
          "feeStructure"
        )
        .populate(
          "feeAssignment"
        );

    return res.status(200).json({
      success: true,
      message:
        "Membership cancelled successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Cancel membership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to cancel membership",
      errors: [],
    });
  }
};

// --------------------------------------------------
// ACTIVATE MEMBERSHIP
// --------------------------------------------------

const activateMembership = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership ID",
        errors: [],
      });
    }

    const membership =
      await Membership.findById(id);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
        errors: [],
      });
    }

    if (
      membership.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled membership cannot be activated",
        errors: [],
      });
    }

    if (
      !membership.feeAssignment
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership fee assignment is required before activation",
        errors: [],
      });
    }

    const assignment =
      await FeeAssignment.findById(
        membership.feeAssignment
      );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Fee assignment not found",
        errors: [],
      });
    }

    if (
      assignment.status !==
      "paid"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership can only be activated after full payment",
        errors: [],
      });
    }

    membership.status =
      getMembershipStatus(
        membership.startDate,
        membership.endDate,
        "active"
      );

    await membership.save();

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "MEMBERSHIP_ACTIVATE",

      entity:
        "Membership",

      entityId:
        membership._id,

      metadata: {
        membershipCode:
          membership.membershipCode,

        student:
          membership.student,

        feeAssignment:
          membership.feeAssignment,
      },

      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Membership activated successfully",
      data: membership,
    });
  } catch (error) {
    console.error(
      "Activate membership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to activate membership",
      errors: [],
    });
  }
};

module.exports = {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  suspendMembership,
  cancelMembership,
  activateMembership,
};