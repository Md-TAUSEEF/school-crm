const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "late",
        "excused",
      ],
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One student can have only one attendance
 * record for a particular:
 *
 * class + subject + date
 */
attendanceSchema.index(
  {
    student: 1,
    class: 1,
    subject: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

/*
 * Session/date reports
 */
attendanceSchema.index({
  academicSession: 1,
  date: 1,
});

/*
 * Class/date views
 */
attendanceSchema.index({
  class: 1,
  date: 1,
});

/*
 * Section/date views
 */
attendanceSchema.index({
  section: 1,
  date: 1,
});

/*
 * Subject/date views
 */
attendanceSchema.index({
  subject: 1,
  date: 1,
});

/*
 * Student attendance history
 */
attendanceSchema.index({
  student: 1,
  date: 1,
});

/*
 * Status reports
 */
attendanceSchema.index({
  status: 1,
  date: 1,
});

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);