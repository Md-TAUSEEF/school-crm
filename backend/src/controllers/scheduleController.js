const mongoose = require("mongoose");

const Schedule = require("../models/Schedule");
const Program = require("../models/Program");
const AcademicSession = require("../models/AcademicSession");
const Class = require("../models/Class");
const Section = require("../models/Section");
const Subject = require("../models/Subject");
const User = require("../models/User");

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getCurrentUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

// =====================================================
// VALIDATE ACADEMIC HIERARCHY
// =====================================================

const validateAcademicHierarchy = async ({
  program,
  academicSession,
  classId,
  section,
  subject,
}) => {
  // ---------------------------------------------------
  // Program
  // ---------------------------------------------------

  const programExists = await Program.findById(program);

  if (!programExists) {
    return {
      valid: false,
      status: 404,
      message: "Program not found",
      code: "PROGRAM_NOT_FOUND",
    };
  }

  // ---------------------------------------------------
  // Academic Session
  // ---------------------------------------------------

  const sessionExists =
    await AcademicSession.findById(academicSession);

  if (!sessionExists) {
    return {
      valid: false,
      status: 404,
      message: "Academic session not found",
      code: "ACADEMIC_SESSION_NOT_FOUND",
    };
  }

  // ---------------------------------------------------
  // Class
  // ---------------------------------------------------

  const classExists = await Class.findById(classId);

  if (!classExists) {
    return {
      valid: false,
      status: 404,
      message: "Class not found",
      code: "CLASS_NOT_FOUND",
    };
  }

  // Class → Program
  if (
    classExists.program &&
    classExists.program.toString() !==
      program.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Class does not belong to the selected program",
      code: "CLASS_PROGRAM_MISMATCH",
    };
  }

  // Class → Academic Session
  if (
    classExists.academicSession &&
    classExists.academicSession.toString() !==
      academicSession.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Class does not belong to the selected academic session",
      code: "CLASS_SESSION_MISMATCH",
    };
  }

  // ---------------------------------------------------
  // Section
  // ---------------------------------------------------

  const sectionExists =
    await Section.findById(section);

  if (!sectionExists) {
    return {
      valid: false,
      status: 404,
      message: "Section not found",
      code: "SECTION_NOT_FOUND",
    };
  }

  // Section → Class
  if (
    sectionExists.class &&
    sectionExists.class.toString() !==
      classId.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Section does not belong to the selected class",
      code: "SECTION_CLASS_MISMATCH",
    };
  }

  // Section → Academic Session
  if (
    sectionExists.academicSession &&
    sectionExists.academicSession.toString() !==
      academicSession.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Section does not belong to the selected academic session",
      code: "SECTION_SESSION_MISMATCH",
    };
  }

  // ---------------------------------------------------
  // Subject
  // ---------------------------------------------------

  const subjectExists =
    await Subject.findById(subject);

  if (!subjectExists) {
    return {
      valid: false,
      status: 404,
      message: "Subject not found",
      code: "SUBJECT_NOT_FOUND",
    };
  }

  // Subject → Program
  if (
    subjectExists.program &&
    subjectExists.program.toString() !==
      program.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Subject does not belong to the selected program",
      code: "SUBJECT_PROGRAM_MISMATCH",
    };
  }

  // Subject → Session
  if (
    subjectExists.academicSession &&
    subjectExists.academicSession.toString() !==
      academicSession.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Subject does not belong to the selected academic session",
      code: "SUBJECT_SESSION_MISMATCH",
    };
  }

  // Subject → Class
  if (
    subjectExists.class &&
    subjectExists.class.toString() !==
      classId.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Subject does not belong to the selected class",
      code: "SUBJECT_CLASS_MISMATCH",
    };
  }

  // Subject → Section
  if (
    subjectExists.section &&
    subjectExists.section.toString() !==
      section.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Subject does not belong to the selected section",
      code: "SUBJECT_SECTION_MISMATCH",
    };
  }

  return {
    valid: true,
    programExists,
    sessionExists,
    classExists,
    sectionExists,
    subjectExists,
  };
};

// =====================================================
// VALIDATE INSTRUCTOR
// =====================================================

const validateInstructor = async ({
  instructor,
  program,
  academicSession,
  classId,
  section,
}) => {
  const instructorExists =
    await User.findById(instructor);

  if (!instructorExists) {
    return {
      valid: false,
      status: 404,
      message: "Instructor not found",
      code: "INSTRUCTOR_NOT_FOUND",
    };
  }

  if (instructorExists.role !== "teacher") {
    return {
      valid: false,
      status: 400,
      message:
        "Selected user is not a teacher",
      code: "INVALID_INSTRUCTOR_ROLE",
    };
  }

  if (instructorExists.status === "inactive") {
    return {
      valid: false,
      status: 400,
      message:
        "Selected teacher is inactive",
      code: "INACTIVE_INSTRUCTOR",
    };
  }

  return {
    valid: true,
    instructorExists,
  };
};

// =====================================================
// CREATE SCHEDULE
// =====================================================

const createSchedule = async (req, res) => {
  try {
    const {
      program,
      academicSession,
      class: classId,
      section,
      subject,
      instructor,
      room,
      status,
      notes,
    } = req.body;

    // ---------------------------------------------------
    // Required fields
    // ---------------------------------------------------

    if (
      !program ||
      !academicSession ||
      !classId ||
      !section ||
      !subject ||
      !instructor
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Program, academic session, class, section, subject and instructor are required",
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    // ---------------------------------------------------
    // Validate IDs
    // ---------------------------------------------------

    const ids = [
      ["program", program],
      ["academic session", academicSession],
      ["class", classId],
      ["section", section],
      ["subject", subject],
      ["instructor", instructor],
    ];

    for (const [label, value] of ids) {
      if (!isValidObjectId(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${label} ID`,
          code: "INVALID_ID",
        });
      }
    }

    // ---------------------------------------------------
    // Validate hierarchy
    // ---------------------------------------------------

    const hierarchy =
      await validateAcademicHierarchy({
        program,
        academicSession,
        classId,
        section,
        subject,
      });

    if (!hierarchy.valid) {
      return res.status(hierarchy.status).json({
        success: false,
        message: hierarchy.message,
        code: hierarchy.code,
      });
    }

    // ---------------------------------------------------
    // Validate instructor
    // ---------------------------------------------------

    const instructorValidation =
      await validateInstructor({
        instructor,
        program,
        academicSession,
        classId,
        section,
      });

    if (!instructorValidation.valid) {
      return res
        .status(instructorValidation.status)
        .json({
          success: false,
          message: instructorValidation.message,
          code: instructorValidation.code,
        });
    }

    // ---------------------------------------------------
    // Check duplicate assignment
    // ---------------------------------------------------

    const existingSchedule =
      await Schedule.findOne({
        academicSession,
        section,
        subject,
      });

    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this section",
        code: "SUBJECT_ALREADY_ASSIGNED",
      });
    }

    // ---------------------------------------------------
    // Create
    // ---------------------------------------------------

    const schedule = await Schedule.create({
      program,
      academicSession,
      class: classId,
      section,
      subject,
      instructor,
      room: room || "",
      status: status || "active",
      notes: notes || "",
      createdBy: getCurrentUserId(req),
    });

    // ---------------------------------------------------
    // Populate
    // ---------------------------------------------------

    const populatedSchedule =
      await Schedule.findById(schedule._id)
        .populate(
          "program",
          "name code"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "section",
          "name code roomNumber capacity"
        )
        .populate(
          "subject",
          "name code description maxMarks status"
        )
        .populate(
          "instructor",
          "firstName lastName email phone userId role status"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        );

    return res.status(201).json({
      success: true,
      message:
        "Schedule created successfully",
      schedule: populatedSchedule,
    });
  } catch (error) {
    console.error(
      "Create schedule error:",
      error
    );

    // Duplicate MongoDB index
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this section",
        code: "DUPLICATE_SCHEDULE",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create schedule",
      code: "SCHEDULE_CREATE_FAILED",
    });
  }
};

// =====================================================
// GET ALL SCHEDULES
// =====================================================

const getSchedules = async (req, res) => {
  try {
    const {
      program,
      academicSession,
      class: classId,
      section,
      subject,
      instructor,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // ---------------------------------------------------
    // Filters
    // ---------------------------------------------------

    const filterIds = [
      ["program", program],
      ["academicSession", academicSession],
      ["class", classId],
      ["section", section],
      ["subject", subject],
      ["instructor", instructor],
    ];

    for (const [field, value] of filterIds) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} ID`,
            code: "INVALID_ID",
          });
        }

        filter[field] = value;
      }
    }

    if (status) {
      filter.status = status;
    }

    // ---------------------------------------------------
    // Pagination
    // ---------------------------------------------------

    const pageNumber = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        parseInt(limit, 10) || 20,
        1
      ),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    // ---------------------------------------------------
    // Query
    // ---------------------------------------------------

    const [schedules, total] =
      await Promise.all([
        Schedule.find(filter)
          .populate(
            "program",
            "name code"
          )
          .populate(
            "academicSession",
            "name code"
          )
          .populate(
            "class",
            "name code"
          )
          .populate(
            "section",
            "name code roomNumber capacity"
          )
          .populate(
            "subject",
            "name code description maxMarks status"
          )
          .populate(
            "instructor",
            "firstName lastName email phone userId role status"
          )
          .populate(
            "createdBy",
            "firstName lastName email userId"
          )
          .populate(
            "updatedBy",
            "firstName lastName email userId"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber),

        Schedule.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      count: schedules.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages:
        Math.ceil(total / limitNumber),
      schedules,
    });
  } catch (error) {
    console.error(
      "Get schedules error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch schedules",
      code: "SCHEDULE_FETCH_FAILED",
    });
  }
};

// =====================================================
// GET SCHEDULE BY ID
// =====================================================

const getScheduleById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid schedule ID",
        code: "INVALID_SCHEDULE_ID",
      });
    }

    const schedule =
      await Schedule.findById(id)
        .populate(
          "program",
          "name code"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "section",
          "name code roomNumber capacity"
        )
        .populate(
          "subject",
          "name code description maxMarks status"
        )
        .populate(
          "instructor",
          "firstName lastName email phone userId role status"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        )
        .populate(
          "updatedBy",
          "firstName lastName email userId"
        );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message:
          "Schedule not found",
        code: "SCHEDULE_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error(
      "Get schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch schedule",
      code: "SCHEDULE_FETCH_FAILED",
    });
  }
};

// =====================================================
// UPDATE SCHEDULE
// =====================================================

const updateSchedule = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid schedule ID",
        code: "INVALID_SCHEDULE_ID",
      });
    }

    const schedule =
      await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message:
          "Schedule not found",
        code: "SCHEDULE_NOT_FOUND",
      });
    }

    const {
      program,
      academicSession,
      class: classId,
      section,
      subject,
      instructor,
      room,
      status,
      notes,
    } = req.body;

    // ---------------------------------------------------
    // Final values
    // ---------------------------------------------------

    const finalProgram =
      program !== undefined
        ? program
        : schedule.program;

    const finalAcademicSession =
      academicSession !== undefined
        ? academicSession
        : schedule.academicSession;

    const finalClass =
      classId !== undefined
        ? classId
        : schedule.class;

    const finalSection =
      section !== undefined
        ? section
        : schedule.section;

    const finalSubject =
      subject !== undefined
        ? subject
        : schedule.subject;

    const finalInstructor =
      instructor !== undefined
        ? instructor
        : schedule.instructor;

    // ---------------------------------------------------
    // Validate IDs
    // ---------------------------------------------------

    const ids = [
      ["program", finalProgram],
      [
        "academic session",
        finalAcademicSession,
      ],
      ["class", finalClass],
      ["section", finalSection],
      ["subject", finalSubject],
      ["instructor", finalInstructor],
    ];

    for (const [label, value] of ids) {
      if (!isValidObjectId(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${label} ID`,
          code: "INVALID_ID",
        });
      }
    }

    // ---------------------------------------------------
    // Validate hierarchy
    // ---------------------------------------------------

    const hierarchy =
      await validateAcademicHierarchy({
        program: finalProgram,
        academicSession:
          finalAcademicSession,
        classId: finalClass,
        section: finalSection,
        subject: finalSubject,
      });

    if (!hierarchy.valid) {
      return res.status(
        hierarchy.status
      ).json({
        success: false,
        message: hierarchy.message,
        code: hierarchy.code,
      });
    }

    // ---------------------------------------------------
    // Validate instructor
    // ---------------------------------------------------

    const instructorValidation =
      await validateInstructor({
        instructor: finalInstructor,
        program: finalProgram,
        academicSession:
          finalAcademicSession,
        classId: finalClass,
        section: finalSection,
      });

    if (!instructorValidation.valid) {
      return res
        .status(
          instructorValidation.status
        )
        .json({
          success: false,
          message:
            instructorValidation.message,
          code:
            instructorValidation.code,
        });
    }

    // ---------------------------------------------------
    // Duplicate check
    // ---------------------------------------------------

    const duplicate =
      await Schedule.findOne({
        academicSession:
          finalAcademicSession,
        section: finalSection,
        subject: finalSubject,
        _id: {
          $ne: schedule._id,
        },
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this section",
        code:
          "SUBJECT_ALREADY_ASSIGNED",
      });
    }

    // ---------------------------------------------------
    // Update
    // ---------------------------------------------------

    schedule.program = finalProgram;
    schedule.academicSession =
      finalAcademicSession;
    schedule.class = finalClass;
    schedule.section = finalSection;
    schedule.subject = finalSubject;
    schedule.instructor =
      finalInstructor;

    if (room !== undefined) {
      schedule.room = room;
    }

    if (status !== undefined) {
      schedule.status = status;
    }

    if (notes !== undefined) {
      schedule.notes = notes;
    }

    schedule.updatedBy =
      getCurrentUserId(req);

    await schedule.save();

    // ---------------------------------------------------
    // Populate
    // ---------------------------------------------------

    const updatedSchedule =
      await Schedule.findById(
        schedule._id
      )
        .populate(
          "program",
          "name code"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "section",
          "name code roomNumber capacity"
        )
        .populate(
          "subject",
          "name code description maxMarks status"
        )
        .populate(
          "instructor",
          "firstName lastName email phone userId role status"
        )
        .populate(
          "createdBy",
          "firstName lastName email userId"
        )
        .populate(
          "updatedBy",
          "firstName lastName email userId"
        );

    return res.status(200).json({
      success: true,
      message:
        "Schedule updated successfully",
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error(
      "Update schedule error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this section",
        code: "DUPLICATE_SCHEDULE",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update schedule",
      code: "SCHEDULE_UPDATE_FAILED",
    });
  }
};

// =====================================================
// DELETE SCHEDULE
// =====================================================

const deleteSchedule = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid schedule ID",
        code: "INVALID_SCHEDULE_ID",
      });
    }

    const schedule =
      await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message:
          "Schedule not found",
        code: "SCHEDULE_NOT_FOUND",
      });
    }

    await schedule.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Schedule deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete schedule",
      code: "SCHEDULE_DELETE_FAILED",
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};