const express = require("express");

const {
  createRenewal,
  getRenewals,
  getRenewalById,
  updateRenewal,
  cancelRenewal,
  approveRenewal,
  completeRenewal,
} = require("../controllers/renewalController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createRenewal);

router.get("/", getRenewals);

router.get("/:id", getRenewalById);

router.put("/:id", updateRenewal);

router.put("/:id/cancel", cancelRenewal);
router.put("/:id/approve", approveRenewal);
router.put("/:id/complete", completeRenewal);

module.exports = router;
