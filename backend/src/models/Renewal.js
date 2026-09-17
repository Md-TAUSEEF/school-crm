
const mongoose = require("mongoose");

const renewalSchema = new mongoose.Schema(
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

    previousMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
    },

    newMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      default: null,
    },

    renewalNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    renewalDate: {
      type: Date,
      default: Date.now,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    amount: {
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

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "failed", "cancelled"],
      default: "pending",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    processedAt: {
      type: Date,
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

renewalSchema.index({
  student: 1,
});

renewalSchema.index({
  academicSession: 1,
});

renewalSchema.index({
  previousMembership: 1,
});

renewalSchema.index({
  newMembership: 1,
});

renewalSchema.index({
  status: 1,
});

renewalSchema.index({
  paymentStatus: 1,
});

renewalSchema.index({
  renewalDate: -1,
});

module.exports = mongoose.model("Renewal", renewalSchema);

