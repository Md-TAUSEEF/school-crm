const express = require("express");

const {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
} = require("../controllers/programController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createProgram);
router.get("/", getPrograms);
router.get("/:id", getProgramById);
router.put("/:id", updateProgram);
router.delete("/:id", deleteProgram);

module.exports = router;