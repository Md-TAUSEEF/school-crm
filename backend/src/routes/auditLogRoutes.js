const express = require("express");

const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Audit Logs
| Admin only
|--------------------------------------------------------------------------
*/

router.use(protect);

router.get(
  "/",
  authorize("admin"),
  getAuditLogs
);

router.get(
  "/:id",
  authorize("admin"),
  getAuditLogById
);

module.exports = router;