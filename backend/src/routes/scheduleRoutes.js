const express = require("express");

const {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/scheduleController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// ALL SCHEDULE ROUTES
// =====================================================

router.use(
  protect,
  authorize("admin")
);

// =====================================================
// CREATE
// =====================================================

router.post(
  "/",
  createSchedule
);

// =====================================================
// GET ALL
// =====================================================

router.get(
  "/",
  getSchedules
);

// =====================================================
// GET BY ID
// =====================================================

router.get(
  "/:id",
  getScheduleById
);

// =====================================================
// UPDATE
// =====================================================

router.put(
  "/:id",
  updateSchedule
);

// =====================================================
// DELETE
// =====================================================

router.delete(
  "/:id",
  deleteSchedule
);

module.exports = router;