const express = require("express");

const {
  razorpayWebhook,
} = require("../controllers/razorpayWebhookController");

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

module.exports = router;