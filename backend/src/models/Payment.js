const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

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

    feeAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeAssignment",
      default: null,
    },

    renewal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Renewal",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "razorpay",
      ],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },

    transactionId: {
      type: String,
      trim: true,
      default: "",
    },

    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: "",
    },

    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: "",
    },

    razorpaySignature: {
      type: String,
      trim: true,
      default: "",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Performance Indexes
|--------------------------------------------------------------------------
*/

paymentSchema.index({
  student: 1,
});

paymentSchema.index({
  academicSession: 1,
});

paymentSchema.index({
  feeAssignment: 1,
});

paymentSchema.index({
  renewal: 1,
});

paymentSchema.index({
  paymentStatus: 1,
});

paymentSchema.index({
  paymentMethod: 1,
});

paymentSchema.index({
  paymentDate: -1,
});

paymentSchema.index({
  transactionId: 1,
});

module.exports = mongoose.model("Payment", paymentSchema);