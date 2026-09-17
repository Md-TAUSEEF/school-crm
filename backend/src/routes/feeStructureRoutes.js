const express = require("express");

const {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
} = require("../controllers/feeStructureController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createFeeStructure);
router.get("/", getFeeStructures);
router.get("/:id", getFeeStructureById);
router.put("/:id", updateFeeStructure);
router.delete("/:id", deleteFeeStructure);

module.exports = router;