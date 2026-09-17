const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
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

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    room: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "cancelled",
      ],
      default: "active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

scheduleSchema.index({
  program: 1,
  academicSession: 1,
  class: 1,
  section: 1,
});

scheduleSchema.index({
  instructor: 1,
  academicSession: 1,
});

scheduleSchema.index({
  subject: 1,
  academicSession: 1,
});

scheduleSchema.index({
  status: 1,
});

scheduleSchema.index(
  {
    academicSession: 1,
    section: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Schedule",
  scheduleSchema
);