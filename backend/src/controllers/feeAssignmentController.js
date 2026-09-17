const mongoose = require("mongoose");

const FeeAssignment = require("../models/FeeAssignment");
const User = require("../models/User");
const AcademicSession = require("../models/AcademicSession");
const FeeStructure = require("../models/FeeStructure");
const Enrollment = require("../models/Enrollment");
const Membership = require("../models/Membership");

const {
  createAuditLog,
} = require("../services/auditLogService");

const MAX_PAGE_LIMIT = 100;

const FEE_ASSIGNMENT_STATUSES = [
  "due",
  "partial",
  "paid",
  "overdue",
  "cancelled",
];

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const sendServerError = (
  res,
  message,
  code
) => {
  return res.status(500).json({
    success: false,
    message,
    code,
    errors: [],
  });
};

/*
|--------------------------------------------------------------------------
| POPULATE
|--------------------------------------------------------------------------
*/

const populateFeeAssignment = (query) => {
  return query
    .populate(
      "student",
      "firstName lastName email phone userId status"
    )
    .populate(
      "enrollment",
      "student academicSession program class section enrollmentDate rollNumber status"
    )
    .populate(
      "membership",
      "membershipName membershipCode startDate endDate amount status autoRenew"
    )
    .populate(
      "academicSession",
      "name code startDate endDate status"
    )
    .populate(
      "feeStructure",
      "name code feeType amount frequency dueDay status"
    );
};

/*
|--------------------------------------------------------------------------
| CREATE FEE ASSIGNMENT
|--------------------------------------------------------------------------
|
| New flow:
|
| Enrollment
|      ↓
| Membership
|      ↓
| Fee Assignment
|      ↓
| Payment
|
| Fee Assignment does NOT accept totalFee from frontend.
| It comes from Membership.amount snapshot.
|
|--------------------------------------------------------------------------
*/

const createFeeAssignment = async (req, res) => {
  try {
    const {
      membership,
      discount = 0,
      dueDate = null,
      notes = "",
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | REQUIRED
    |--------------------------------------------------------------------------
    */

    if (!membership) {
      return res.status(400).json({
        success: false,
        message: "Membership is required",
        code: "MEMBERSHIP_REQUIRED",
        errors: [],
      });
    }

    if (!isValidObjectId(membership)) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID",
        code: "INVALID_MEMBERSHIP_ID",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

    if (
      notes !== undefined &&
      notes !== null
    ) {
      if (typeof notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Notes must be a valid string",
          code: "INVALID_NOTES",
          errors: [],
        });
      }

      if (notes.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Notes cannot exceed 1000 characters",
          code: "NOTES_TOO_LONG",
          errors: [],
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | GET MEMBERSHIP
    |--------------------------------------------------------------------------
    */

    const membershipRecord =
      await Membership.findById(membership)
        .populate(
          "student",
          "_id firstName lastName email phone userId status role"
        )
        .populate(
          "academicSession",
          "_id name code startDate endDate status"
        )
        .populate(
          "enrollment",
          "_id student academicSession program class section enrollmentDate rollNumber status"
        )
        .populate(
          "feeStructure",
          "_id name code feeType amount frequency dueDay status academicSession program class"
        );

    if (!membershipRecord) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
        code: "MEMBERSHIP_NOT_FOUND",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBERSHIP STATUS
    |--------------------------------------------------------------------------
    */

    if (
      membershipRecord.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled membership cannot receive a fee assignment",
        code: "MEMBERSHIP_CANCELLED",
        errors: [],
      });
    }

    if (
      membershipRecord.status === "suspended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Suspended membership cannot receive a fee assignment",
        code: "MEMBERSHIP_SUSPENDED",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STUDENT VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!membershipRecord.student) {
      return res.status(400).json({
        success: false,
        message: "Membership has no student",
        code: "MEMBERSHIP_STUDENT_MISSING",
        errors: [],
      });
    }

    const studentRecord =
      membershipRecord.student;

    if (studentRecord.role !== "student") {
      return res.status(400).json({
        success: false,
        message:
          "Membership student is not a student account",
        code: "INVALID_STUDENT",
        errors: [],
      });
    }

    if (studentRecord.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Inactive or suspended student cannot receive a fee assignment",
        code: "STUDENT_NOT_ACTIVE",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ENROLLMENT VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!membershipRecord.enrollment) {
      return res.status(400).json({
        success: false,
        message:
          "Membership is not linked to an enrollment",
        code: "MEMBERSHIP_ENROLLMENT_MISSING",
        errors: [],
      });
    }

    const enrollmentRecord =
      membershipRecord.enrollment;

    if (
      enrollmentRecord.status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only active enrollment can receive a fee assignment",
        code: "ENROLLMENT_NOT_ACTIVE",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STUDENT ↔ ENROLLMENT
    |--------------------------------------------------------------------------
    */

    if (
      String(enrollmentRecord.student) !==
      String(studentRecord._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment does not belong to membership student",
        code: "ENROLLMENT_STUDENT_MISMATCH",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACADEMIC SESSION VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !membershipRecord.academicSession
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership has no academic session",
        code: "MEMBERSHIP_SESSION_MISSING",
        errors: [],
      });
    }

    if (
      String(
        enrollmentRecord.academicSession
      ) !==
      String(
        membershipRecord.academicSession._id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment and membership academic session do not match",
        code: "ENROLLMENT_SESSION_MISMATCH",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FEE STRUCTURE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !membershipRecord.feeStructure
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership is not linked to a fee structure",
        code: "MEMBERSHIP_FEE_STRUCTURE_MISSING",
        errors: [],
      });
    }

    const feeStructureRecord =
      membershipRecord.feeStructure;

    if (
      feeStructureRecord.status !==
      "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership fee structure is inactive",
        code: "FEE_STRUCTURE_INACTIVE",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FEE STRUCTURE SESSION
    |--------------------------------------------------------------------------
    */

    if (
      String(
        feeStructureRecord.academicSession
      ) !==
      String(
        membershipRecord.academicSession._id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure and membership academic session do not match",
        code: "FEE_STRUCTURE_SESSION_MISMATCH",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBERSHIP AMOUNT
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We intentionally use membership.amount,
    | NOT feeStructure.amount.
    |
    | This preserves historical pricing.
    |
    */

    const totalFee = Number(
      membershipRecord.amount
    );

    if (
      !Number.isFinite(totalFee) ||
      totalFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Membership contains an invalid amount",
        code: "INVALID_MEMBERSHIP_AMOUNT",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT
    |--------------------------------------------------------------------------
    */

    const numericDiscount =
      Number(discount);

    if (
      !Number.isFinite(
        numericDiscount
      ) ||
      numericDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount must be a valid non-negative number",
        code: "INVALID_DISCOUNT",
        errors: [],
      });
    }

    if (
      numericDiscount > totalFee
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than total fee",
        code: "INVALID_DISCOUNT",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CALCULATE AMOUNTS
    |--------------------------------------------------------------------------
    */

    const payableAmount =
      totalFee - numericDiscount;

    const paidAmount = 0;

    const remainingAmount =
      payableAmount;

    const status =
      payableAmount === 0
        ? "paid"
        : "due";

    /*
    |--------------------------------------------------------------------------
    | DUE DATE
    |--------------------------------------------------------------------------
    */

    let normalizedDueDate = null;

    if (
      dueDate !== null &&
      dueDate !== undefined &&
      dueDate !== ""
    ) {
      normalizedDueDate =
        new Date(dueDate);

      if (
        Number.isNaN(
          normalizedDueDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
          code: "INVALID_DUE_DATE",
          errors: [],
        });
      }

      if (
        membershipRecord.academicSession
          .startDate &&
        normalizedDueDate <
          new Date(
            membershipRecord
              .academicSession
              .startDate
          )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Due date cannot be before academic session start date",
          code: "INVALID_DUE_DATE",
          errors: [],
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DUPLICATE CHECK
    |--------------------------------------------------------------------------
    */

    const existingAssignment =
      await FeeAssignment.findOne({
        membership: membershipRecord._id,
      }).select(
        "_id status payableAmount paidAmount remainingAmount"
      );

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message:
          "A fee assignment already exists for this membership",
        code:
          "FEE_ASSIGNMENT_ALREADY_EXISTS",
        data: {
          assignmentId:
            existingAssignment._id,
          status:
            existingAssignment.status,
          payableAmount:
            existingAssignment.payableAmount,
          paidAmount:
            existingAssignment.paidAmount,
          remainingAmount:
            existingAssignment.remainingAmount,
        },
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const feeAssignment =
      await FeeAssignment.create({
        student:
          studentRecord._id,

        enrollment:
          enrollmentRecord._id,

        membership:
          membershipRecord._id,

        academicSession:
          membershipRecord
            .academicSession
            ._id,

        feeStructure:
          feeStructureRecord._id,

        /*
         * Snapshot.
         */
        totalFee,

        discount:
          numericDiscount,

        payableAmount,

        paidAmount,

        remainingAmount,

        dueDate:
          normalizedDueDate,

        status,

        notes:
          String(notes || "").trim(),
      });

    /*
    |--------------------------------------------------------------------------
    | LINK ASSIGNMENT TO MEMBERSHIP
    |--------------------------------------------------------------------------
    */

    membershipRecord.feeAssignment =
      feeAssignment._id;

    await membershipRecord.save();

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "FEE_ASSIGNMENT_CREATE",

      entity:
        "FeeAssignment",

      entityId:
        feeAssignment._id,

      metadata: {
        student:
          studentRecord._id,

        enrollment:
          enrollmentRecord._id,

        membership:
          membershipRecord._id,

        academicSession:
          membershipRecord
            .academicSession
            ._id,

        feeStructure:
          feeStructureRecord._id,

        totalFee,

        discount:
          numericDiscount,

        payableAmount,
      },

      req,
    });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    const populatedAssignment =
      await populateFeeAssignment(
        FeeAssignment.findById(
          feeAssignment._id
        )
      );

    return res.status(201).json({
      success: true,
      message:
        "Fee assignment created successfully",
      data: populatedAssignment,
    });
  } catch (error) {
    console.error(
      "Create Fee Assignment Error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Fee assignment already exists for this membership",
        code:
          "FEE_ASSIGNMENT_ALREADY_EXISTS",
        errors: [],
      });
    }

    return sendServerError(
      res,
      "Failed to create fee assignment",
      "CREATE_FEE_ASSIGNMENT_ERROR"
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL FEE ASSIGNMENTS
|--------------------------------------------------------------------------
*/

const getFeeAssignments = async (
  req,
  res
) => {
  try {
    const {
      student,
      enrollment,
      membership,
      academicSession,
      feeStructure,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage =
      Number(page);

    const parsedLimit =
      Number(limit);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Page must be a positive integer",
        code: "INVALID_PAGE",
        errors: [],
      });
    }

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > MAX_PAGE_LIMIT
    ) {
      return res.status(400).json({
        success: false,
        message: `Limit must be between 1 and ${MAX_PAGE_LIMIT}`,
        code: "INVALID_LIMIT",
        errors: [],
      });
    }

    const ids = {
      student,
      enrollment,
      membership,
      academicSession,
      feeStructure,
    };

    for (const [
      key,
      value,
    ] of Object.entries(ids)) {
      if (
        value &&
        !isValidObjectId(value)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${key} ID`,
          code: `INVALID_${key
            .toUpperCase()}_ID`,
          errors: [],
        });
      }
    }

    if (
      status &&
      !FEE_ASSIGNMENT_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee assignment status",
        code: "INVALID_STATUS",
        errors: [],
      });
    }

    const filter = {};

    if (student)
      filter.student = student;

    if (enrollment)
      filter.enrollment = enrollment;

    if (membership)
      filter.membership = membership;

    if (academicSession)
      filter.academicSession =
        academicSession;

    if (feeStructure)
      filter.feeStructure =
        feeStructure;

    if (status)
      filter.status = status;

    const skip =
      (parsedPage - 1) *
      parsedLimit;

    const [
      assignments,
      total,
    ] = await Promise.all([
      populateFeeAssignment(
        FeeAssignment.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(parsedLimit)
      ),

      FeeAssignment.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Fee assignments fetched successfully",
      count:
        assignments.length,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages:
          Math.ceil(
            total / parsedLimit
          ),
      },
      data: assignments,
    });
  } catch (error) {
    console.error(
      "Get Fee Assignments Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to fetch fee assignments",
      "GET_FEE_ASSIGNMENTS_ERROR"
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET FEE ASSIGNMENT BY ID
|--------------------------------------------------------------------------
*/

const getFeeAssignmentById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee assignment ID",
        code:
          "INVALID_FEE_ASSIGNMENT_ID",
        errors: [],
      });
    }

    const assignment =
      await populateFeeAssignment(
        FeeAssignment.findById(id)
      );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Fee assignment not found",
        code:
          "FEE_ASSIGNMENT_NOT_FOUND",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Fee assignment fetched successfully",
      data: assignment,
    });
  } catch (error) {
    console.error(
      "Get Fee Assignment Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to fetch fee assignment",
      "GET_FEE_ASSIGNMENT_ERROR"
    );
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE FEE ASSIGNMENT
|--------------------------------------------------------------------------
|
| Allowed:
| - discount
| - dueDate
| - notes
|
| Not allowed:
| - student
| - enrollment
| - membership
| - academicSession
| - feeStructure
| - totalFee
| - paidAmount
|
|--------------------------------------------------------------------------
*/

const updateFeeAssignment = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee assignment ID",
        code:
          "INVALID_FEE_ASSIGNMENT_ID",
        errors: [],
      });
    }

    const assignment =
      await FeeAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Fee assignment not found",
        code:
          "FEE_ASSIGNMENT_NOT_FOUND",
        errors: [],
      });
    }

    if (
      assignment.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled fee assignment cannot be updated",
        code:
          "FEE_ASSIGNMENT_CANCELLED",
        errors: [],
      });
    }

    const {
      discount,
      dueDate,
      notes,
      paidAmount,
      totalFee,
      membership,
      student,
      enrollment,
      academicSession,
      feeStructure,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | IMMUTABLE FIELDS
    |--------------------------------------------------------------------------
    */

    if (
      paidAmount !== undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be updated from fee assignment. Use the payment module.",
        code:
          "PAID_AMOUNT_UPDATE_NOT_ALLOWED",
        errors: [],
      });
    }

    if (
      totalFee !== undefined ||
      membership !== undefined ||
      student !== undefined ||
      enrollment !== undefined ||
      academicSession !== undefined ||
      feeStructure !== undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student, enrollment, membership, academic session, fee structure and total fee cannot be changed after assignment creation",
        code:
          "IMMUTABLE_ASSIGNMENT_FIELDS",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PREVIOUS VALUES
    |--------------------------------------------------------------------------
    */

    const previousValues = {
      discount:
        assignment.discount,

      payableAmount:
        assignment.payableAmount,

      paidAmount:
        assignment.paidAmount,

      remainingAmount:
        assignment.remainingAmount,

      status:
        assignment.status,

      dueDate:
        assignment.dueDate,

      notes:
        assignment.notes,
    };

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT
    |--------------------------------------------------------------------------
    */

    if (
      discount !== undefined
    ) {
      const numericDiscount =
        Number(discount);

      if (
        !Number.isFinite(
          numericDiscount
        ) ||
        numericDiscount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discount must be a valid non-negative number",
          code:
            "INVALID_DISCOUNT",
          errors: [],
        });
      }

      if (
        numericDiscount >
        assignment.totalFee
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discount cannot be greater than total fee",
          code:
            "INVALID_DISCOUNT",
          errors: [],
        });
      }

      assignment.discount =
        numericDiscount;
    }

    /*
    |--------------------------------------------------------------------------
    | RECALCULATE
    |--------------------------------------------------------------------------
    */

    assignment.payableAmount =
      Number(
        assignment.totalFee
      ) -
      Number(
        assignment.discount
      );

    if (
      Number(
        assignment.paidAmount
      ) >
      Number(
        assignment.payableAmount
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot reduce payable amount below already paid amount",
        code:
          "DISCOUNT_BELOW_PAID_AMOUNT",
        errors: [],
      });
    }

    assignment.remainingAmount =
      Number(
        assignment.payableAmount
      ) -
      Number(
        assignment.paidAmount
      );

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (
      assignment.paidAmount ===
      assignment.payableAmount
    ) {
      assignment.status =
        "paid";
    } else if (
      assignment.paidAmount > 0
    ) {
      assignment.status =
        "partial";
    } else {
      assignment.status =
        "due";
    }

    /*
    |--------------------------------------------------------------------------
    | DUE DATE
    |--------------------------------------------------------------------------
    */

    if (
      dueDate !== undefined
    ) {
      if (
        dueDate === null ||
        dueDate === ""
      ) {
        assignment.dueDate =
          null;
      } else {
        const normalizedDueDate =
          new Date(dueDate);

        if (
          Number.isNaN(
            normalizedDueDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid due date",
            code:
              "INVALID_DUE_DATE",
            errors: [],
          });
        }

        const session =
          await AcademicSession.findById(
            assignment.academicSession
          ).select(
            "startDate"
          );

        if (
          session?.startDate &&
          normalizedDueDate <
            new Date(
              session.startDate
            )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Due date cannot be before academic session start date",
            code:
              "INVALID_DUE_DATE",
            errors: [],
          });
        }

        assignment.dueDate =
          normalizedDueDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

    if (
      notes !== undefined
    ) {
      if (
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Notes must be a valid string",
          code:
            "INVALID_NOTES",
          errors: [],
        });
      }

      if (
        notes.length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Notes cannot exceed 1000 characters",
          code:
            "NOTES_TOO_LONG",
          errors: [],
        });
      }

      assignment.notes =
        notes.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    await assignment.save();

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "FEE_ASSIGNMENT_UPDATE",

      entity:
        "FeeAssignment",

      entityId:
        assignment._id,

      metadata: {
        previous:
          previousValues,

        updated: {
          discount:
            assignment.discount,

          payableAmount:
            assignment.payableAmount,

          paidAmount:
            assignment.paidAmount,

          remainingAmount:
            assignment.remainingAmount,

          status:
            assignment.status,

          dueDate:
            assignment.dueDate,

          notes:
            assignment.notes,
        },
      },

      req,
    });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    const populatedAssignment =
      await populateFeeAssignment(
        FeeAssignment.findById(
          assignment._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Fee assignment updated successfully",
      data: populatedAssignment,
    });
  } catch (error) {
    console.error(
      "Update Fee Assignment Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to update fee assignment",
      "UPDATE_FEE_ASSIGNMENT_ERROR"
    );
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL FEE ASSIGNMENT
|--------------------------------------------------------------------------
*/

const cancelFeeAssignment = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee assignment ID",
        code:
          "INVALID_FEE_ASSIGNMENT_ID",
        errors: [],
      });
    }

    const assignment =
      await FeeAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Fee assignment not found",
        code:
          "FEE_ASSIGNMENT_NOT_FOUND",
        errors: [],
      });
    }

    if (
      assignment.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee assignment is already cancelled",
        code:
          "ALREADY_CANCELLED",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT PROTECTION
    |--------------------------------------------------------------------------
    */

    if (
      Number(
        assignment.paidAmount
      ) > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fee assignment with payment cannot be cancelled directly",
        code:
          "PAYMENT_EXISTS",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CANCEL
    |--------------------------------------------------------------------------
    */

    const previousStatus =
      assignment.status;

    assignment.status =
      "cancelled";

    await assignment.save();

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      userId:
        req.user?._id ||
        req.user?.id ||
        null,

      action:
        "FEE_ASSIGNMENT_CANCEL",

      entity:
        "FeeAssignment",

      entityId:
        assignment._id,

      metadata: {
        previousStatus,

        newStatus:
          "cancelled",

        student:
          assignment.student,

        enrollment:
          assignment.enrollment,

        membership:
          assignment.membership,

        academicSession:
          assignment.academicSession,

        feeStructure:
          assignment.feeStructure,
      },

      req,
    });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    const populatedAssignment =
      await populateFeeAssignment(
        FeeAssignment.findById(
          assignment._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Fee assignment cancelled successfully",
      data: populatedAssignment,
    });
  } catch (error) {
    console.error(
      "Cancel Fee Assignment Error:",
      error
    );

    return sendServerError(
      res,
      "Failed to cancel fee assignment",
      "CANCEL_FEE_ASSIGNMENT_ERROR"
    );
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createFeeAssignment,
  getFeeAssignments,
  getFeeAssignmentById,
  updateFeeAssignment,
  cancelFeeAssignment,
};