const express = require("express");

const {
  createParent,
  getParents,
  getParentById,
  updateParent,
} = require("../controllers/parentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/", createParent);

router.get("/", getParents);

router.get("/:id", getParentById);

router.put("/:id", updateParent);

module.exports = router;