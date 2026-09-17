const mongoose = require("mongoose");
const Query = require("../models/Query");
const User = require("../models/User");
const { createAuditLog } = require("../services/auditLogService");

const STAFF_ROLES = ["admin", "teacher"];

const QUERY_CATEGORIES = [
  "admission",
  "attendance",
  "progress",
  "class",
  "schedule",
  "membership",
  "renewal",
  "payment",
  "trial",
  "technical",
  "general",
  "other",
];

const QUERY_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
];

const QUERY_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) =>
  req.user?._id || req.user?.id || null;

const getRole = (req) =>
  req.user?.role || null;

const getCurrentYear = () =>
  new Date().getFullYear();

const isStaff = (req) =>
  STAFF_ROLES.includes(getRole(req));

const isAdmin = (req) =>
  getRole(req) === "admin";

// ---------------------------------------------------------
// Query Sanitization
// ---------------------------------------------------------

const sanitizeQueryForUser = (query, role) => {
  if (!query) {
    return query;
  }

  const safeQuery =
    typeof query.toObject === "function"
      ? query.toObject()
      : { ...query };

  // Internal information is staff-only.
  if (role === "parent" || role === "student") {
    delete safeQuery.internalNotes;

    safeQuery.replies = (
      safeQuery.replies || []
    ).filter(
      (reply) => !reply.isInternal
    );
  }

  return safeQuery;
};

// ---------------------------------------------------------
// Populate Helper
// ---------------------------------------------------------

const populateQuery = (query) =>
  query
    .populate(
      "createdBy",
      "firstName lastName email phone role userId"
    )
    .populate(
      "parent",
      "firstName lastName email phone userId"
    )
    .populate(
      "student",
      "firstName lastName email phone userId"
    )
    .populate(
      "assignedTo",
      "firstName lastName email phone role userId"
    )
    .populate(
      "resolvedBy",
      "firstName lastName email role userId"
    )
    .populate(
      "closedBy",
      "firstName lastName email role userId"
    )
    .populate(
      "replies.sender",
      "firstName lastName email phone role userId"
    );

// ---------------------------------------------------------
// Query Number
// ---------------------------------------------------------

const generateQueryNumber = async () => {
  const year = getCurrentYear();

  const lastQuery = await Query.findOne({
    queryNumber: new RegExp(
      `^QUERY-${year}-`
    ),
  })
    .sort({ createdAt: -1 })
    .select("queryNumber");

  let nextNumber = 1;

  if (lastQuery?.queryNumber) {
    const parts =
      lastQuery.queryNumber.split("-");

    const lastNumber =
      Number(parts[2]);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `QUERY-${year}-${String(
    nextNumber
  ).padStart(6, "0")}`;
};

// ---------------------------------------------------------
// CREATE QUERY
// ---------------------------------------------------------

const createQuery = async (req, res) => {
  try {
    const {
      parent,
      student,
      subject,
      message,
      category = "general",
      priority = "medium",
      visitorName = "",
      visitorPhone = "",
      visitorEmail = "",
    } = req.body;

    if (
      !subject ||
      !String(subject).trim() ||
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and message are required",
        code: "REQUIRED_FIELDS_MISSING",
        errors: [],
      });
    }

    if (
      !QUERY_CATEGORIES.includes(
        category
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid query category",
        code: "INVALID_QUERY_CATEGORY",
        errors: [],
      });
    }

    if (
      !QUERY_PRIORITIES.includes(
        priority
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid query priority",
        code: "INVALID_QUERY_PRIORITY",
        errors: [],
      });
    }

    const userId = getUserId(req);
    const role = getRole(req);

    // -----------------------------------------------------
    // Logged-in user validation
    // -----------------------------------------------------

    if (userId) {
      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid authenticated user ID",
          code: "INVALID_USER_ID",
          errors: [],
        });
      }

      const user =
        await User.findById(userId).select(
          "firstName lastName email phone role status"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Authenticated user not found",
          code: "USER_NOT_FOUND",
          errors: [],
        });
      }

      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message:
            "Inactive users cannot create queries",
          code: "USER_INACTIVE",
          errors: [],
        });
      }

      // Parent can create query only for self
      // and linked students.
      if (role === "parent") {
        if (
          parent &&
          String(parent) !==
            String(userId)
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Parent can only create queries for their own account",
            code: "PARENT_ACCESS_DENIED",
            errors: [],
          });
        }

        if (student) {
          if (
            !isValidObjectId(student)
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid student ID",
              code: "INVALID_STUDENT_ID",
              errors: [],
            });
          }

          const linkedStudent =
            await User.findOne({
              _id: student,
              role: "student",
              status: "active",
              parents: userId,
            }).select("_id");

          if (!linkedStudent) {
            return res.status(403).json({
              success: false,
              message:
                "Student is not linked to this parent",
              code: "STUDENT_NOT_LINKED",
              errors: [],
            });
          }
        }
      }

      // Student can only create query
      // for himself.
      if (role === "student") {
        if (
          student &&
          String(student) !==
            String(userId)
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Students can only create queries for themselves",
            code: "STUDENT_ACCESS_DENIED",
            errors: [],
          });
        }
      }
    }

    // -----------------------------------------------------
    // Visitor validation
    // -----------------------------------------------------

    if (!userId) {
      if (
        !visitorName ||
        !String(visitorName).trim() ||
        !visitorPhone ||
        !String(visitorPhone).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Visitor name and phone are required",
          code: "VISITOR_DETAILS_REQUIRED",
          errors: [],
        });
      }

      if (student || parent) {
        return res.status(400).json({
          success: false,
          message:
            "Unauthenticated visitors cannot link parent or student records",
          code: "VISITOR_LINK_RESTRICTED",
          errors: [],
        });
      }
    }

    // -----------------------------------------------------
    // Validate parent
    // -----------------------------------------------------

    if (parent) {
      if (!isValidObjectId(parent)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent ID",
          code: "INVALID_PARENT_ID",
          errors: [],
        });
      }

      const parentUser =
        await User.findOne({
          _id: parent,
          role: "parent",
          status: "active",
        }).select("_id");

      if (!parentUser) {
        return res.status(404).json({
          success: false,
          message: "Parent not found",
          code: "PARENT_NOT_FOUND",
          errors: [],
        });
      }
    }

    // -----------------------------------------------------
    // Validate student
    // -----------------------------------------------------

    if (student) {
      if (!isValidObjectId(student)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID",
          code: "INVALID_STUDENT_ID",
          errors: [],
        });
      }

      const studentUser =
        await User.findOne({
          _id: student,
          role: "student",
          status: "active",
        }).select("_id");

      if (!studentUser) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
          code: "STUDENT_NOT_FOUND",
          errors: [],
        });
      }
    }

    // -----------------------------------------------------
    // Generate Query Number
    // -----------------------------------------------------

    let queryNumber =
      await generateQueryNumber();

    let numberExists =
      await Query.exists({
        queryNumber,
      });

    while (numberExists) {
      const randomSuffix =
        Math.floor(
          100 +
            Math.random() * 900
        );

      queryNumber =
        `QUERY-${getCurrentYear()}-${randomSuffix}${Date.now()
          .toString()
          .slice(-3)}`;

      numberExists =
        await Query.exists({
          queryNumber,
        });
    }

    // -----------------------------------------------------
    // Create
    // -----------------------------------------------------

    const query =
      await Query.create({
        queryNumber,

        createdBy:
          userId || null,

        parent:
          parent ||
          (
            userId &&
            role === "parent"
              ? userId
              : null
          ),

        student:
          student ||
          (
            userId &&
            role === "student"
              ? userId
              : null
          ),

        subject:
          String(subject).trim(),

        message:
          String(message).trim(),

        category,

        priority,

        status: "open",

        visitorName:
          userId
            ? ""
            : String(
                visitorName
              ).trim(),

        visitorPhone:
          userId
            ? ""
            : String(
                visitorPhone
              ).trim(),

        visitorEmail:
          userId
            ? ""
            : String(
                visitorEmail
              ).trim()
              .toLowerCase(),
      });

    // -----------------------------------------------------
    // Audit
    // -----------------------------------------------------

    await createAuditLog({
      userId: userId || null,
      action: "QUERY_CREATE",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
        category:
          query.category,
        priority:
          query.priority,
        visitor: !userId,
      },
      req,
    });

    const populatedQuery =
      await populateQuery(
        Query.findById(query._id)
      );

    return res.status(201).json({
      success: true,
      message:
        "Query created successfully",
      data:
        sanitizeQueryForUser(
          populatedQuery,
          role
        ),
    });
  } catch (error) {
    console.error(
      "createQuery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create query",
      code:
        "QUERY_CREATE_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// GET QUERIES
// ---------------------------------------------------------

const getQueries = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      parent,
      student,
      page = 1,
      limit = 20,
    } = req.query;

    const queryFilter = {};

    const userId = getUserId(req);
    const role = getRole(req);

    // -----------------------------------------------------
    // Parent
    // -----------------------------------------------------

    if (role === "parent") {
      queryFilter.$or = [
        {
          createdBy: userId,
        },
        {
          parent: userId,
        },
      ];

      if (student) {
        if (
          !isValidObjectId(student)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid student ID",
            code:
              "INVALID_STUDENT_ID",
            errors: [],
          });
        }

        const linkedStudent =
          await User.findOne({
            _id: student,
            role: "student",
            parents: userId,
          }).select("_id");

        if (!linkedStudent) {
          return res.status(403).json({
            success: false,
            message:
              "Student is not linked to this parent",
            code:
              "STUDENT_NOT_LINKED",
            errors: [],
          });
        }

        queryFilter.$and = [
          {
            student,
          },
          {
            $or: [
              {
                createdBy: userId,
              },
              {
                parent: userId,
              },
            ],
          },
        ];

        delete queryFilter.$or;
      }
    }

    // -----------------------------------------------------
    // Student
    // -----------------------------------------------------

    else if (role === "student") {
      queryFilter.createdBy =
        userId;

      if (
        student &&
        String(student) !==
          String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Students can only access their own queries",
          code:
            "STUDENT_ACCESS_DENIED",
          errors: [],
        });
      }
    }

    // -----------------------------------------------------
    // Staff/Admin
    // -----------------------------------------------------

    else if (isStaff(req)) {
      if (parent) {
        if (
          !isValidObjectId(parent)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid parent ID",
            code:
              "INVALID_PARENT_ID",
            errors: [],
          });
        }

        queryFilter.parent =
          parent;
      }

      if (student) {
        if (
          !isValidObjectId(student)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid student ID",
            code:
              "INVALID_STUDENT_ID",
            errors: [],
          });
        }

        queryFilter.student =
          student;
      }

      if (assignedTo) {
        if (
          !isValidObjectId(
            assignedTo
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid assigned staff ID",
            code:
              "INVALID_ASSIGNED_TO_ID",
            errors: [],
          });
        }

        queryFilter.assignedTo =
          assignedTo;
      }
    }

    // -----------------------------------------------------
    // Common Filters
    // -----------------------------------------------------

    if (status) {
      if (
        !QUERY_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid query status",
          code:
            "INVALID_QUERY_STATUS",
          errors: [],
        });
      }

      queryFilter.status =
        status;
    }

    if (priority) {
      if (
        !QUERY_PRIORITIES.includes(
          priority
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid query priority",
          code:
            "INVALID_QUERY_PRIORITY",
          errors: [],
        });
      }

      queryFilter.priority =
        priority;
    }

    if (category) {
      if (
        !QUERY_CATEGORIES.includes(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid query category",
          code:
            "INVALID_QUERY_CATEGORY",
          errors: [],
        });
      }

      queryFilter.category =
        category;
    }

    const parsedPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const parsedLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    const skip =
      (parsedPage - 1) *
      parsedLimit;

    const [
      queryDocuments,
      total,
    ] = await Promise.all([
      populateQuery(
        Query.find(queryFilter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(parsedLimit)
      ),

      Query.countDocuments(
        queryFilter
      ),
    ]);

    const queries =
      queryDocuments.map(
        (query) =>
          sanitizeQueryForUser(
            query,
            role
          )
      );

    return res.status(200).json({
      success: true,
      message:
        "Queries fetched successfully",
      data: {
        queries,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages:
          Math.ceil(
            total /
              parsedLimit
          ),
      },
    });
  } catch (error) {
    console.error(
      "getQueries error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch queries",
      code:
        "QUERY_LIST_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// GET QUERY BY ID
// ---------------------------------------------------------

const getQueryById = async (
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
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    const query =
      await populateQuery(
        Query.findById(id)
      );

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    const userId =
      getUserId(req);

    const role =
      getRole(req);

    // Parent ownership
    if (role === "parent") {
      const hasAccess =
        String(
          query.createdBy?._id || ""
        ) === String(userId) ||
        String(
          query.parent?._id || ""
        ) === String(userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this query",
          code:
            "QUERY_ACCESS_DENIED",
          errors: [],
        });
      }
    }

    // Student ownership
    if (role === "student") {
      if (
        String(
          query.createdBy?._id || ""
        ) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this query",
          code:
            "QUERY_ACCESS_DENIED",
          errors: [],
        });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Query fetched successfully",
      data:
        sanitizeQueryForUser(
          query,
          role
        ),
    });
  } catch (error) {
    console.error(
      "getQueryById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch query",
      code:
        "QUERY_FETCH_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// ASSIGN QUERY
// ---------------------------------------------------------

const assignQuery = async (
  req,
  res
) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff can assign queries",
        code:
          "QUERY_ASSIGN_ACCESS_DENIED",
        errors: [],
      });
    }

    const { id } =
      req.params;

    const { assignedTo } =
      req.body;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message:
          "assignedTo is required",
        code:
          "ASSIGNED_TO_REQUIRED",
        errors: [],
      });
    }

    if (
      !isValidObjectId(
        assignedTo
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid assigned staff ID",
        code:
          "INVALID_ASSIGNED_TO_ID",
        errors: [],
      });
    }

    const assignedUser =
      await User.findOne({
        _id: assignedTo,
        role: {
          $in: STAFF_ROLES,
        },
        status: "active",
      }).select(
        "_id firstName lastName email role"
      );

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message:
          "Active staff member not found",
        code:
          "ASSIGNED_STAFF_NOT_FOUND",
        errors: [],
      });
    }

    const query =
      await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    if (
      query.status === "closed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closed queries cannot be assigned",
        code:
          "QUERY_ALREADY_CLOSED",
        errors: [],
      });
    }

    query.assignedTo =
      assignedTo;

    if (
      query.status === "open"
    ) {
      query.status =
        "assigned";
    }

    await query.save();

    await createAuditLog({
      userId: getUserId(req),
      action: "QUERY_ASSIGN",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
        assignedTo,
      },
      req,
    });

    const populatedQuery =
      await populateQuery(
        Query.findById(
          query._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Query assigned successfully",
      data:
        sanitizeQueryForUser(
          populatedQuery,
          getRole(req)
        ),
    });
  } catch (error) {
    console.error(
      "assignQuery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to assign query",
      code:
        "QUERY_ASSIGN_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// ADD QUERY REPLY
// ---------------------------------------------------------

const addQueryReply = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const {
      message,
      isInternal = false,
    } = req.body;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    if (
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reply message is required",
        code:
          "REPLY_MESSAGE_REQUIRED",
        errors: [],
      });
    }

    const userId =
      getUserId(req);

    const role =
      getRole(req);

    const query =
      await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    if (
      query.status === "closed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closed queries cannot receive replies",
        code:
          "QUERY_ALREADY_CLOSED",
        errors: [],
      });
    }

    // Internal replies are staff-only.
    if (
      isInternal &&
      !isStaff(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff can add internal notes",
        code:
          "INTERNAL_NOTE_ACCESS_DENIED",
        errors: [],
      });
    }

    // Parent ownership.
    if (role === "parent") {
      const hasAccess =
        String(
          query.createdBy || ""
        ) === String(userId) ||
        String(
          query.parent || ""
        ) === String(userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to reply to this query",
          code:
            "QUERY_ACCESS_DENIED",
          errors: [],
        });
      }

      if (isInternal) {
        return res.status(403).json({
          success: false,
          message:
            "Parents cannot create internal notes",
          code:
            "INTERNAL_NOTE_ACCESS_DENIED",
          errors: [],
        });
      }
    }

    // Student ownership.
    if (role === "student") {
      if (
        String(
          query.createdBy || ""
        ) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to reply to this query",
          code:
            "QUERY_ACCESS_DENIED",
          errors: [],
        });
      }

      if (isInternal) {
        return res.status(403).json({
          success: false,
          message:
            "Students cannot create internal notes",
          code:
            "INTERNAL_NOTE_ACCESS_DENIED",
          errors: [],
        });
      }
    }

    // -----------------------------------------------------
    // Add reply
    // -----------------------------------------------------

    query.replies.push({
      sender:
        userId || null,

      senderType:
        userId
          ? isStaff(req)
            ? "staff"
            : "user"
          : "visitor",

      message:
        String(message).trim(),

      isInternal:
        Boolean(isInternal),
    });

    // Public response means conversation is active.
    if (
      !isInternal &&
      ["open", "assigned"].includes(
        query.status
      )
    ) {
      query.status =
        "in_progress";
    }

    await query.save();

    await createAuditLog({
      userId: userId || null,
      action: isInternal
        ? "QUERY_INTERNAL_REPLY"
        : "QUERY_REPLY",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
        isInternal:
          Boolean(isInternal),
      },
      req,
    });

    const populatedQuery =
      await populateQuery(
        Query.findById(
          query._id
        )
      );

    return res.status(200).json({
      success: true,
      message: isInternal
        ? "Internal note added successfully"
        : "Reply added successfully",
      data:
        sanitizeQueryForUser(
          populatedQuery,
          role
        ),
    });
  } catch (error) {
    console.error(
      "addQueryReply error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add query reply",
      code:
        "QUERY_REPLY_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// UPDATE STATUS
// ---------------------------------------------------------

const updateQueryStatus = async (
  req,
  res
) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff can update query status",
        code:
          "QUERY_STATUS_ACCESS_DENIED",
        errors: [],
      });
    }

    const { id } =
      req.params;

    const { status } =
      req.body;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    if (
      !QUERY_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query status",
        code:
          "INVALID_QUERY_STATUS",
        errors: [],
      });
    }

    const query =
      await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    if (
      query.status === "closed" &&
      status !== "closed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closed queries cannot be reopened",
        code:
          "QUERY_CLOSED_LOCKED",
        errors: [],
      });
    }

    const userId =
      getUserId(req);

    query.status =
      status;

    if (
      status === "resolved"
    ) {
      query.resolvedAt =
        query.resolvedAt ||
        new Date();

      query.resolvedBy =
        query.resolvedBy ||
        userId;
    }

    if (
      status === "closed"
    ) {
      if (!query.resolvedAt) {
        query.resolvedAt =
          new Date();

        query.resolvedBy =
          userId;
      }

      query.closedAt =
        query.closedAt ||
        new Date();

      query.closedBy =
        query.closedBy ||
        userId;
    }

    // If query moves away from resolved,
    // preserve history rather than deleting it.
    await query.save();

    await createAuditLog({
      userId,
      action:
        "QUERY_STATUS_UPDATE",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
        status,
      },
      req,
    });

    const populatedQuery =
      await populateQuery(
        Query.findById(
          query._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Query status updated successfully",
      data:
        sanitizeQueryForUser(
          populatedQuery,
          getRole(req)
        ),
    });
  } catch (error) {
    console.error(
      "updateQueryStatus error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update query status",
      code:
        "QUERY_STATUS_UPDATE_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// UPDATE INTERNAL NOTES
// ---------------------------------------------------------

const updateInternalNotes = async (
  req,
  res
) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff can update internal notes",
        code:
          "INTERNAL_NOTE_ACCESS_DENIED",
        errors: [],
      });
    }

    const { id } =
      req.params;

    const {
      internalNotes,
    } = req.body;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    if (
      internalNotes === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "internalNotes is required",
        code:
          "INTERNAL_NOTES_REQUIRED",
        errors: [],
      });
    }

    const query =
      await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    if (
      query.status === "closed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closed queries cannot be modified",
        code:
          "QUERY_ALREADY_CLOSED",
        errors: [],
      });
    }

    query.internalNotes =
      String(
        internalNotes
      ).trim();

    await query.save();

    await createAuditLog({
      userId:
        getUserId(req),
      action:
        "QUERY_INTERNAL_NOTES_UPDATE",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Internal notes updated successfully",
      data: {
        id: query._id,
        internalNotes:
          query.internalNotes,
      },
    });
  } catch (error) {
    console.error(
      "updateInternalNotes error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update internal notes",
      code:
        "INTERNAL_NOTES_UPDATE_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// CLOSE QUERY
// ---------------------------------------------------------

const closeQuery = async (
  req,
  res
) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff can close queries",
        code:
          "QUERY_CLOSE_ACCESS_DENIED",
        errors: [],
      });
    }

    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid query ID",
        code:
          "INVALID_QUERY_ID",
        errors: [],
      });
    }

    const query =
      await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message:
          "Query not found",
        code:
          "QUERY_NOT_FOUND",
        errors: [],
      });
    }

    if (
      query.status === "closed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Query is already closed",
        code:
          "QUERY_ALREADY_CLOSED",
        errors: [],
      });
    }

    const userId =
      getUserId(req);

    query.status =
      "closed";

    if (!query.resolvedAt) {
      query.resolvedAt =
        new Date();

      query.resolvedBy =
        userId;
    }

    query.closedAt =
      new Date();

    query.closedBy =
      userId;

    await query.save();

    await createAuditLog({
      userId,
      action: "QUERY_CLOSE",
      entity: "Query",
      entityId: query._id,
      metadata: {
        queryNumber:
          query.queryNumber,
      },
      req,
    });

    const populatedQuery =
      await populateQuery(
        Query.findById(
          query._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Query closed successfully",
      data:
        sanitizeQueryForUser(
          populatedQuery,
          getRole(req)
        ),
    });
  } catch (error) {
    console.error(
      "closeQuery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to close query",
      code:
        "QUERY_CLOSE_FAILED",
      errors: [],
    });
  }
};

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

module.exports = {
  createQuery,
  getQueries,
  getQueryById,
  assignQuery,
  addQueryReply,
  updateQueryStatus,
  updateInternalNotes,
  closeQuery,
};