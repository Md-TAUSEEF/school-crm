const express = require("express");

const {
  createAcademicSession,
  getAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
  deleteAcademicSession,
} = require("../controllers/academicSessionController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createAcademicSession);
router.get("/", getAcademicSessions);
router.get("/:id", getAcademicSessionById);
router.put("/:id", updateAcademicSession);
router.delete("/:id", deleteAcademicSession);

module.exports = router;