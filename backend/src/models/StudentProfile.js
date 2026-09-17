const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    postalCode: {
      type: String,
      trim: true,
      default: "",
    },

    admissionDate: {
      type: Date,
      default: null,
    },

    currentAcademicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      default: null,
    },

    currentClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    currentSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "graduated",
        "transferred",
        "suspended",
        "withdrawn",
      ],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

studentProfileSchema.index({ currentClass: 1 });
studentProfileSchema.index({ currentSection: 1 });
studentProfileSchema.index({ currentAcademicSession: 1 });
studentProfileSchema.index({ status: 1 });

module.exports = mongoose.model(
  "StudentProfile",
  studentProfileSchema
);