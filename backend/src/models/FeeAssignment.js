const mongoose = require("mongoose");

const feeAssignmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
    },

    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },

    /*
     * Snapshot of the fee at the time of assignment.
     *
     * This must NOT change if FeeStructure.amount
     * changes later.
     */
    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    payableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "due",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
      default: "due",
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

/*
 * One fee assignment for one membership.
 *
 * This prevents accidentally creating the same
 * assignment twice for the same membership.
 */
feeAssignmentSchema.index(
  { membership: 1 },
  { unique: true }
);

feeAssignmentSchema.index({
  student: 1,
});

feeAssignmentSchema.index({
  enrollment: 1,
});

feeAssignmentSchema.index({
  academicSession: 1,
});

feeAssignmentSchema.index({
  feeStructure: 1,
});

feeAssignmentSchema.index({
  status: 1,
});

feeAssignmentSchema.index({
  dueDate: 1,
});

module.exports = mongoose.model(
  "FeeAssignment",
  feeAssignmentSchema
);