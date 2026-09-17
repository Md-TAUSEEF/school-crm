const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

const MAX_PAGE_LIMIT = 100;

const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = req.query;

    const parsedPage = Math.max(
      Number(page) || 1,
      1
    );

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      MAX_PAGE_LIMIT
    );

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Action Filter
    |--------------------------------------------------------------------------
    */

    if (action) {
      const normalizedAction = String(action)
        .trim()
        .toUpperCase();

      if (normalizedAction.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid action filter",
          errors: [],
          code: "INVALID_ACTION",
        });
      }

      filter.action = normalizedAction;
    }

    /*
    |--------------------------------------------------------------------------
    | Entity Filter
    |--------------------------------------------------------------------------
    */

    if (entity) {
      const normalizedEntity = String(entity)
        .trim();

      if (
        !normalizedEntity ||
        normalizedEntity.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid entity filter",
          errors: [],
          code: "INVALID_ENTITY",
        });
      }

      filter.entity = normalizedEntity;
    }

    /*
    |--------------------------------------------------------------------------
    | User Filter
    |--------------------------------------------------------------------------
    */

    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
          errors: [],
          code: "INVALID_USER_ID",
        });
      }

      filter.userId = userId;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filters
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      filter.createdAt = {};

      let start;
      let end;

      if (startDate) {
        start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid startDate",
            errors: [],
            code: "INVALID_START_DATE",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid endDate",
            errors: [],
            code: "INVALID_END_DATE",
          });
        }

        end.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = end;
      }

      /*
      |--------------------------------------------------------------------------
      | Date Range Validation
      |--------------------------------------------------------------------------
      */

      if (
        start &&
        end &&
        start.getTime() > end.getTime()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "startDate cannot be greater than endDate",
          errors: [],
          code: "INVALID_DATE_RANGE",
        });
      }
    }

    const skip =
      (parsedPage - 1) * parsedLimit;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate(
          "userId",
          "firstName lastName email role userId"
        )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: {
        items,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(
            total / parsedLimit
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Get audit logs error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      errors: [],
      code: "AUDIT_LOG_FETCH_FAILED",
    });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | ObjectId Validation
    |--------------------------------------------------------------------------
    */

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit log ID",
        errors: [],
        code: "INVALID_AUDIT_LOG_ID",
      });
    }

    const auditLog = await AuditLog.findById(id)
      .populate(
        "userId",
        "firstName lastName email role userId"
      )
      .lean();

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
        errors: [],
        code: "AUDIT_LOG_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Audit log fetched successfully",
      data: auditLog,
    });
  } catch (error) {
    console.error(
      "Get audit log error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
      errors: [],
      code: "AUDIT_LOG_FETCH_FAILED",
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
};