const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
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

    capacity: {
      type: Number,
      min: 1,
      default: null,
    },

    roomNumber: {
      type: String,
      trim: true,
      default: "",
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

sectionSchema.index(
  {
    class: 1,
    academicSession: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

sectionSchema.index(
  {
    class: 1,
    academicSession: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Section", sectionSchema);