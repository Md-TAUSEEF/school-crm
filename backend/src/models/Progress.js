const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
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

    skillLevel: {
      type: String,
      trim: true,
      default: "",
    },

    beltRank: {
      type: String,
      trim: true,
      default: "",
    },

    assessment: {
      type: String,
      trim: true,
      default: "",
    },

    strengths: {
      type: String,
      trim: true,
      default: "",
    },

    weaknesses: {
      type: String,
      trim: true,
      default: "",
    },

    instructorComments: {
      type: String,
      trim: true,
      default: "",
    },

    nextGoals: {
      type: String,
      trim: true,
      default: "",
    },

    assessmentDate: {
      type: Date,
      required: true,
    },

    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index({
  student: 1,
  academicSession: 1,
  assessmentDate: -1,
});

progressSchema.index({
  student: 1,
  assessmentDate: -1,
});

progressSchema.index({
  academicSession: 1,
  assessmentDate: -1,
});

module.exports = mongoose.model("Progress", progressSchema);