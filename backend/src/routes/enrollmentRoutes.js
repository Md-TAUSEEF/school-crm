const express = require("express");

const {
  getEnrollments,
  getEnrollmentById,
} = require("../controllers/enrollmentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", getEnrollments);

router.get("/:id", getEnrollmentById);

module.exports = router;