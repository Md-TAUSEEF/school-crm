const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  userId = null,
  action,
  entity,
  entityId = null,
  metadata = {},
  req = null,
}) => {
  try {
    if (!action || !entity) {
      return null;
    }

    const auditLog = await AuditLog.create({
      userId,
      action: String(action).trim().toUpperCase(),
      entity: String(entity).trim(),
      entityId,
      metadata:
        metadata && typeof metadata === "object"
          ? metadata
          : {},
      ipAddress:
        req?.headers?.["x-forwarded-for"]
          ?.split(",")[0]
          ?.trim() ||
        req?.ip ||
        "",
      userAgent:
        req?.headers?.["user-agent"] || "",
    });

    return auditLog;
  } catch (error) {
    /*
     * Audit logging must never break
     * the main business operation.
     */
    console.error(
      "Audit log error:",
      error.message
    );

    return null;
  }
};

module.exports = {
  createAuditLog,
};