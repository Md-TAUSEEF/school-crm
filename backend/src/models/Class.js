const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
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

classSchema.index(
  {
    program: 1,
    academicSession: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

classSchema.index(
  {
    program: 1,
    academicSession: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Class", classSchema);