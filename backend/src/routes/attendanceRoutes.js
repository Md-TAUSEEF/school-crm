const express = require("express");

const {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  getStudentAttendance,
  getAttendanceStatistics,
  getSectionStudentsForAttendance,
} = require("../controllers/attendanceController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// AUTH
// =====================================================

router.use(
  protect,
  authorize("admin")
);

// =====================================================
// CREATE ATTENDANCE
// =====================================================

router.post(
  "/",
  createAttendance
);

// =====================================================
// GET ATTENDANCE
// =====================================================

router.get(
  "/",
  getAttendances
);

// =====================================================
// ATTENDANCE STATISTICS
// =====================================================

router.get(
  "/statistics",
  getAttendanceStatistics
);

// =====================================================
// SECTION STUDENTS
// =====================================================
//
// Academic Session + Class + Section
// ke active students.
//
// Example:
//
// GET /attendance/section/:sectionId/students
// ?academicSession=xxx&class=xxx
//

router.get(
  "/section/:sectionId/students",
  getSectionStudentsForAttendance
);

// =====================================================
// STUDENT ATTENDANCE
// =====================================================

router.get(
  "/student/:studentId",
  getStudentAttendance
);

// =====================================================
// SINGLE ATTENDANCE
// =====================================================

router.get(
  "/:id",
  getAttendanceById
);

// =====================================================
// UPDATE
// =====================================================

router.put(
  "/:id",
  updateAttendance
);

module.exports = router;