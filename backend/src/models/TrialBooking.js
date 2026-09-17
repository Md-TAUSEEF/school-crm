const mongoose = require("mongoose");

const trialBookingSchema = new mongoose.Schema(
  {
    trialNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    preferredClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    preferredDate: {
      type: Date,
      required: true,
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "contacted",
        "approved",
        "rejected",
        "converted",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    convertedParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    convertedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    contactedAt: {
      type: Date,
      default: null,
    },

    contactedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    completedBy: {
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

trialBookingSchema.index({
  status: 1,
  preferredDate: 1,
});

trialBookingSchema.index({
  preferredClass: 1,
  preferredDate: 1,
});

trialBookingSchema.index({
  assignedTo: 1,
  status: 1,
});

trialBookingSchema.index({
  phone: 1,
  createdAt: -1,
});

trialBookingSchema.index({
  email: 1,
  createdAt: -1,
});

trialBookingSchema.index({
  preferredDate: 1,
});

trialBookingSchema.index({
  createdAt: -1,
});

module.exports = mongoose.model("TrialBooking", trialBookingSchema);