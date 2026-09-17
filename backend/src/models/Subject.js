const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    maxMarks: {
      type: Number,
      default: 100,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Same subject name cannot exist twice
 * inside the same section and academic session.
 */
subjectSchema.index(
  {
    section: 1,
    academicSession: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

/**
 * Same subject code cannot exist twice
 * inside the same section and academic session.
 */
subjectSchema.index(
  {
    section: 1,
    academicSession: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Subject", subjectSchema);