const express = require("express");

const {
  createProgress,
  getProgressRecords,
  getProgressById,
  getStudentProgress,
  updateProgress,
} = require("../controllers/progressController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Admin + Teacher can access progress.
// Controller ensures teacher can access only
// students/classes assigned through Schedule.
router.use(
  protect,
  authorize("admin", "teacher")
);

router.post("/", createProgress);

router.get("/", getProgressRecords);

router.get(
  "/student/:studentId",
  getStudentProgress
);

router.get("/:id", getProgressById);

router.put("/:id", updateProgress);

module.exports = router;