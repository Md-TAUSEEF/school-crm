const express = require("express");

const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deactivateTeacher,
  activateTeacher,
} = require("../controllers/teacherController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All teacher routes require authentication
router.use(protect);

// Create teacher
// Admin only
router.post(
  "/",
  authorize("admin"),
  createTeacher
);

// Get all teachers
// Admin + Teacher
router.get(
  "/",
  authorize("admin", "teacher"),
  getTeachers
);

// Get teacher by ID
// Admin + Teacher
router.get(
  "/:id",
  authorize("admin", "teacher"),
  getTeacherById
);

// Update teacher
// Admin only
router.put(
  "/:id",
  authorize("admin"),
  updateTeacher
);

// Deactivate teacher
// Admin only
router.put(
  "/:id/deactivate",
  authorize("admin"),
  deactivateTeacher
);

// Activate teacher
// Admin only
router.put(
  "/:id/activate",
  authorize("admin"),
  activateTeacher
);

module.exports = router;