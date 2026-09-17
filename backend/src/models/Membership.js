const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      default: null,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    // Master fee reference.
    // New memberships receive this from the controller.
    // Nullable for backward compatibility with old/renewed records.
    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      default: null,
    },

    feeAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeAssignment",
      default: null,
    },

    membershipName: {
      type: String,
      required: true,
      trim: true,
    },

    membershipCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Snapshot of Fee Structure amount.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "expiring",
        "expired",
        "suspended",
        "cancelled",
      ],
      default: "pending",
    },

    autoRenew: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index({
  student: 1,
  academicSession: 1,
});

membershipSchema.index({
  enrollment: 1,
});

membershipSchema.index({
  feeStructure: 1,
});

membershipSchema.index({
  feeAssignment: 1,
});

membershipSchema.index({
  student: 1,
  status: 1,
});

membershipSchema.index({
  endDate: 1,
});

module.exports = mongoose.model("Membership", membershipSchema);