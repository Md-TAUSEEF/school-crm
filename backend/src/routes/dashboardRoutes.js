const express = require("express");

const {
  getDashboard,
} = require("../controllers/dashboardController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  authorize("admin", "teacher"),
  getDashboard
);

module.exports = router;