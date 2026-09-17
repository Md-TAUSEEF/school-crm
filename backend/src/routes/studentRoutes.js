const express = require("express");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
} = require("../controllers/studentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();



router.use(protect, authorize("admin"));

router.post("/", createStudent);

router.get("/", getStudents);

router.get("/:id", getStudentById);

router.put("/:id", updateStudent);

module.exports = router;