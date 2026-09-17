const express = require("express");

const {
  createQuery,
  getQueries,
  getQueryById,
  assignQuery,
  addQueryReply,
  updateQueryStatus,
  updateInternalNotes,
  closeQuery,
} = require("../controllers/queryController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------
// PUBLIC VISITOR QUERY
// ---------------------------------------------------------
// Visitor does not need login/token.

router.post(
  "/visitor",
  createQuery
);

// ---------------------------------------------------------
// PROTECTED QUERY ROUTES
// ---------------------------------------------------------

router.use(protect);

// Logged-in user creates query
router.post(
  "/",
  createQuery
);

// Parent / Student / Staff query list
router.get(
  "/",
  getQueries
);

// Single query
router.get(
  "/:id",
  getQueryById
);

// ---------------------------------------------------------
// STAFF / ADMIN ACTIONS
// ---------------------------------------------------------

router.put(
  "/:id/assign",
  authorize("admin", "teacher"),
  assignQuery
);

router.post(
  "/:id/replies",
  authorize(
    "admin",
    "teacher",
    "parent",
    "student"
  ),
  addQueryReply
);

router.put(
  "/:id/status",
  authorize("admin", "teacher"),
  updateQueryStatus
);

router.put(
  "/:id/internal-notes",
  authorize("admin", "teacher"),
  updateInternalNotes
);

router.put(
  "/:id/close",
  authorize("admin", "teacher"),
  closeQuery
);

module.exports = router;