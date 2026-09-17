const express = require("express");

const {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  approveAdmission,
  rejectAdmission,
} = require("../controllers/admissionController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createAdmission);

router.get("/", getAdmissions);

router.get("/:id", getAdmissionById);

router.put("/:id/approve", approveAdmission);

router.put("/:id/reject", rejectAdmission);

module.exports = router;