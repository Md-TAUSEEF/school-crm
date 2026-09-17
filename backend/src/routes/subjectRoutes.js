const express = require("express");

const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createSubject);

router.get("/", getSubjects);

router.get("/:id", getSubjectById);

router.put("/:id", updateSubject);

router.delete("/:id", deleteSubject);

module.exports = router;