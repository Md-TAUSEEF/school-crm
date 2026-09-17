const Admission = require("../models/Admission");
const Enrollment = require("../models/Enrollment");

const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const StudentGuardian = require("../models/StudentGuardian");

const AcademicSession = require("../models/AcademicSession");
const Program = require("../models/Program");
const Class = require("../models/Class");
const Section = require("../models/Section");

const generateAdmissionNumber = require("../utils/generateAdmissionNumber");

const createAdmission = async (req, res) => {
  try {
    const {
      student,
      parent,
      academicSession,
      program,
      class: classId,
      section,
      admissionDate,
      notes,
    } = req.body;

    if (
      !student ||
      !parent ||
      !academicSession ||
      !program ||
      !classId ||
      !section
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student, parent, academic session, program, class and section are required",
      });
    }

    // Verify student
    const studentUser = await User.findOne({
      _id: student,
      role: "student",
    });

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Verify parent
    const parentUser = await User.findOne({
      _id: parent,
      role: "parent",
    });

    if (!parentUser) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Verify parent-child relationship
    const guardian = await StudentGuardian.findOne({
      student,
      parent,
      status: "active",
    });

    if (!guardian) {
      return res.status(403).json({
        success: false,
        message:
          "This parent is not linked to this student",
      });
    }

    // Verify academic session
    const session = await AcademicSession.findById(
      academicSession
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    // Verify program
    const programRecord = await Program.findById(
      program
    );

    if (!programRecord) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Verify class
    const classRecord = await Class.findById(
      classId
    );

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Make sure class belongs to selected program/session
    if (
      classRecord.program.toString() !==
        program.toString() ||
      classRecord.academicSession.toString() !==
        academicSession.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected class does not belong to the selected program and academic session",
      });
    }

    // Verify section
    const sectionRecord = await Section.findById(
      section
    );

    if (!sectionRecord) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Make sure section belongs to selected class/session
    if (
      sectionRecord.class.toString() !==
        classId.toString() ||
      sectionRecord.academicSession.toString() !==
        academicSession.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected section does not belong to the selected class and academic session",
      });
    }

    // Prevent duplicate active enrollment
    const existingEnrollment =
      await Enrollment.findOne({
        student,
        academicSession,
        status: "active",
      });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message:
          "Student is already enrolled in this academic session",
      });
    }

    // Prevent duplicate pending/approved admission
    const existingAdmission =
      await Admission.findOne({
        student,
        academicSession,
        status: {
          $in: ["pending", "approved"],
        },
      });

    if (existingAdmission) {
      return res.status(409).json({
        success: false,
        message:
          "An active admission already exists for this student in this academic session",
      });
    }

    const admissionNumber =
      await generateAdmissionNumber();

    const admission = await Admission.create({
      admissionNumber,
      student,
      parent,
      academicSession,
      program,
      class: classId,
      section,
      admissionDate:
        admissionDate || new Date(),
      notes: notes?.trim() || "",
      status: "pending",
    });

    const populatedAdmission =
      await Admission.findById(admission._id)
        .populate(
          "student",
          "firstName lastName email phone userId"
        )
        .populate(
          "parent",
          "firstName lastName email phone userId"
        )
        .populate(
          "academicSession",
          "name code startDate endDate status"
        )
        .populate(
          "program",
          "name code duration status"
        )
        .populate(
          "class",
          "name code status"
        )
        .populate(
          "section",
          "name code capacity roomNumber status"
        );

    return res.status(201).json({
      success: true,
      message: "Admission created successfully",
      admission: populatedAdmission,
    });
  } catch (error) {
    console.error("Create admission error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create admission",
      error: error.message,
    });
  }
};

const getAdmissions = async (req, res) => {
  try {
    const admissions = await Admission.find()
      .populate(
        "student",
        "firstName lastName email phone userId"
      )
      .populate(
        "parent",
        "firstName lastName email phone userId"
      )
      .populate(
        "academicSession",
        "name code"
      )
      .populate(
        "program",
        "name code"
      )
      .populate(
        "class",
        "name code"
      )
      .populate(
        "section",
        "name code"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: admissions.length,
      admissions,
    });
  } catch (error) {
    console.error("Get admissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admissions",
      error: error.message,
    });
  }
};

const getAdmissionById = async (req, res) => {
  try {
    const admission =
      await Admission.findById(req.params.id)
        .populate(
          "student",
          "firstName lastName email phone userId"
        )
        .populate(
          "parent",
          "firstName lastName email phone userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "program",
          "name code"
        )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "section",
          "name code"
        )
        .populate(
          "approvedBy",
          "firstName lastName userId"
        )
        .populate(
          "rejectedBy",
          "firstName lastName userId"
        );

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    return res.status(200).json({
      success: true,
      admission,
    });
  } catch (error) {
    console.error("Get admission error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admission",
      error: error.message,
    });
  }
};

const approveAdmission = async (req, res) => {
  try {
    const admission =
      await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    if (admission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending admissions can be approved",
      });
    }

    // Safety check: prevent duplicate enrollment
    const existingEnrollment =
      await Enrollment.findOne({
        student: admission.student,
        academicSession:
          admission.academicSession,
        status: "active",
      });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message:
          "Student is already actively enrolled in this academic session",
      });
    }

    const enrollment = await Enrollment.create({
      student: admission.student,
      academicSession:
        admission.academicSession,
      program: admission.program,
      class: admission.class,
      section: admission.section,
      enrollmentDate:
        admission.admissionDate || new Date(),
      status: "active",
      notes: admission.notes || "",
    });

    admission.status = "approved";
    admission.approvedAt = new Date();
    admission.approvedBy = req.user.id;

    await admission.save();

    // Update student's current academic placement
    await StudentProfile.findOneAndUpdate(
      { user: admission.student },
      {
        currentAcademicSession:
          admission.academicSession,
        currentClass: admission.class,
        currentSection: admission.section,
        admissionDate:
          admission.admissionDate || new Date(),
        status: "active",
      }
    );

    const populatedAdmission =
      await Admission.findById(admission._id)
        .populate(
          "student",
          "firstName lastName email phone userId"
        )
        .populate(
          "parent",
          "firstName lastName email phone userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "program",
          "name code"
        )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "section",
          "name code"
        )
        .populate(
          "approvedBy",
          "firstName lastName userId"
        );

    return res.status(200).json({
      success: true,
      message:
        "Admission approved and student enrolled successfully",
      admission: populatedAdmission,
      enrollment,
    });
  } catch (error) {
    console.error("Approve admission error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve admission",
      error: error.message,
    });
  }
};

const rejectAdmission = async (req, res) => {
  try {
    const {
      rejectionReason,
    } = req.body;

    const admission =
      await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    if (admission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending admissions can be rejected",
      });
    }

    if (!rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required",
      });
    }

    admission.status = "rejected";
    admission.rejectionReason =
      rejectionReason.trim();
    admission.rejectedAt = new Date();
    admission.rejectedBy = req.user.id;

    await admission.save();

    return res.status(200).json({
      success: true,
      message: "Admission rejected successfully",
      admission,
    });
  } catch (error) {
    console.error("Reject admission error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject admission",
      error: error.message,
    });
  }
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  approveAdmission,
  rejectAdmission,
};