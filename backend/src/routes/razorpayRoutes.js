const express = require("express");

const {
  createRazorpayOrder,
} = require("../controllers/razorpayController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Razorpay routes require authenticated admin for now
router.use(protect, authorize("admin"));

router.post("/orders", createRazorpayOrder);

module.exports = router;