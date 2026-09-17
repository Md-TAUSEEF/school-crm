const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
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

    enrollmentDate: {
      type: Date,
      default: Date.now,
    },

    rollNumber: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "active",
        "completed",
        "transferred",
        "withdrawn",
        "cancelled",
      ],
      default: "active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index(
  {
    student: 1,
    academicSession: 1,
  },
  {
    unique: true,
  }
);

enrollmentSchema.index({
  class: 1,
  section: 1,
  academicSession: 1,
});

enrollmentSchema.index({
  status: 1,
});

module.exports = mongoose.model(
  "Enrollment",
  enrollmentSchema
);