const mongoose = require("mongoose");

const studentGuardianSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    relationship: {
      type: String,
      enum: [
        "father",
        "mother",
        "guardian",
        "grandfather",
        "grandmother",
        "other",
      ],
      required: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    canReceiveNotifications: {
      type: Boolean,
      default: true,
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

studentGuardianSchema.index(
  {
    student: 1,
    parent: 1,
  },
  {
    unique: true,
  }
);

studentGuardianSchema.index({
  parent: 1,
  status: 1,
});

studentGuardianSchema.index({
  student: 1,
  status: 1,
});

module.exports = mongoose.model(
  "StudentGuardian",
  studentGuardianSchema
);