const express = require("express");

const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
} = require("../controllers/classController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createClass);
router.get("/", getClasses);
router.get("/:id", getClassById);
router.put("/:id", updateClass);
router.delete("/:id", deleteClass);

module.exports = router;