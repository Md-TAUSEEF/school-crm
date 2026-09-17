const express = require("express");

const {
  createFeeAssignment,
  getFeeAssignments,
  getFeeAssignmentById,
  updateFeeAssignment,
  cancelFeeAssignment,
} = require("../controllers/feeAssignmentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All fee assignment APIs are admin protected
router.use(protect, authorize("admin"));

// Create
router.post("/", createFeeAssignment);

// Get all
router.get("/", getFeeAssignments);

// Get single
router.get("/:id", getFeeAssignmentById);

// Update
router.put("/:id", updateFeeAssignment);

// Cancel
router.put("/:id/cancel", cancelFeeAssignment);

module.exports = router;