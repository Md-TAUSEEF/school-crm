const express = require("express");

const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Protected
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;