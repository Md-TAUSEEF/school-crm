const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
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
      default: null,
    },

    feeType: {
      type: String,
      enum: [
        "admission",
        "registration",
        "monthly",
        "quarterly",
        "half_yearly",
        "annual",
        "training",
        "assessment",
        "uniform",
        "equipment",
        "other",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    frequency: {
      type: String,
      enum: ["one_time", "monthly", "quarterly", "half_yearly", "yearly"],
      default: "one_time",
    },

    dueDay: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
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
  },
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

feeStructureSchema.index(
  {
    academicSession: 1,
    program: 1,
    class: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

feeStructureSchema.index({
  academicSession: 1,
  program: 1,
});

feeStructureSchema.index({
  class: 1,
});

feeStructureSchema.index({
  feeType: 1,
});

feeStructureSchema.index({
  status: 1,
});

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
