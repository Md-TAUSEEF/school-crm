const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFORMATION
    // =========================

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // =========================
    // ROLE
    // =========================

    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      required: true,
    },

    // =========================
    // UNIQUE HUMAN-READABLE ID
    // =========================

    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // =========================
    // ACCOUNT STATUS
    // =========================

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // PROFILE
    // =========================

    profileImage: {
      type: String,
      default: "",
    },

    // =========================
    // PARENT -> MULTIPLE STUDENTS
    // =========================

    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // =========================
    // STUDENT -> PARENTS
    // =========================

    parents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // =========================
    // LAST LOGIN
    // =========================

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);