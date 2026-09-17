const mongoose = require("mongoose");

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    specialization: {
      type: String,
      trim: true,
      default: "",
    },

    joiningDate: {
      type: Date,
      default: null,
    },

    employeeType: {
      type: String,
      enum: ["full_time", "part_time", "contract", ""],
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

teacherProfileSchema.index({
  status: 1,
});

teacherProfileSchema.index({
  employeeType: 1,
});

teacherProfileSchema.index({
  specialization: 1,
});

module.exports = mongoose.model(
  "TeacherProfile",
  teacherProfileSchema
);