const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const generateUniqueId = require("../utils/generateUniqueId");
const { createAuditLog } = require("../services/auditLogService");

// =========================
// JWT
// =========================

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      userId: user.userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
    } = req.body;

    if (!firstName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "First name, email, password and role are required",
      });
    }

    const allowedRoles = [
      "admin",
      "teacher",
      "student",
      "parent",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userId = await generateUniqueId(role);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      email: normalizedEmail,
      phone: phone?.trim() || "",
      password: hashedPassword,
      role,
      userId,
    });

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

// =========================
// LOGIN
// =========================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    // =========================
    // USER NOT FOUND
    // =========================

    if (!user) {
      await createAuditLog({
        userId: null,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: null,
        metadata: {
          reason: "USER_NOT_FOUND",
          email: normalizedEmail,
        },
        req,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // =========================
    // ACCOUNT NOT ACTIVE
    // =========================

    if (user.status !== "active") {
      await createAuditLog({
        userId: user._id,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user._id,
        metadata: {
          reason: "ACCOUNT_NOT_ACTIVE",
          status: user.status,
        },
        req,
      });

      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    // =========================
    // PASSWORD CHECK
    // =========================

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      await createAuditLog({
        userId: user._id,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user._id,
        metadata: {
          reason: "INVALID_PASSWORD",
        },
        req,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // =========================
    // SUCCESSFUL LOGIN
    // =========================

    user.lastLoginAt = new Date();
    await user.save();

    await createAuditLog({
      userId: user._id,
      action: "LOGIN",
      entity: "User",
      entityId: user._id,
      metadata: {
        role: user.role,
        userId: user.userId,
      },
      req,
    });

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

// =========================
// LOGOUT
// =========================

const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

// =========================
// CURRENT USER
// =========================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};