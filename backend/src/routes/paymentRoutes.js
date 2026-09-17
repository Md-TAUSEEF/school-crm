const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByFeeAssignment,
  getPaymentsByRenewal,
} = require("../controllers/paymentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All payment routes require authenticated admin
router.use(protect, authorize("admin"));

// Create payment
router.post("/", createPayment);

// Get all payments
router.get("/", getPayments);

// Get payment history by fee assignment
router.get(
  "/fee-assignment/:feeAssignmentId",
  getPaymentsByFeeAssignment
);

// Get payment history by renewal
router.get(
  "/renewal/:renewalId",
  getPaymentsByRenewal
);

// Get payment by ID
router.get("/:id", getPaymentById);

module.exports = router;