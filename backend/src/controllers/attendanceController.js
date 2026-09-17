const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AcademicSession = require("../models/AcademicSession");
const Class = require("../models/Class");
const Section = require("../models/Section");
const Subject = require("../models/Subject");
const Enrollment = require("../models/Enrollment");
const Membership = require("../models/Membership");

const { createAuditLog } = require("../services/auditLogService");
const {
  createNotifications,
} = require("../services/notificationService");

// =====================================================
// CONSTANTS
// =====================================================

const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
];

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return (
    Boolean(id) &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const normalizeDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate;
};

const normalizeEndDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(23, 59, 59, 999);

  return parsedDate;
};

const sameId = (a, b) => {
  if (!a || !b) {
    return false;
  }

  return String(a) === String(b);
};

// =====================================================
// VALIDATE ACADEMIC CONTEXT
// =====================================================

/**
 * Valid hierarchy:
 *
 * Academic Session
 *      ↓
 * Class
 *      ↓
 * Section
 *      ↓
 * Subject
 *
 * Subject must belong to:
 * selected academic session
 * selected class
 * selected section
 */
const validateAcademicContext = async ({
  academicSession,
  classId,
  sectionId,
  subjectId,
}) => {
  if (!isValidObjectId(academicSession)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid academic session ID.",
    };
  }

  if (!isValidObjectId(classId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid class ID.",
    };
  }

  if (!isValidObjectId(sectionId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid section ID.",
    };
  }

  if (!isValidObjectId(subjectId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid subject ID.",
    };
  }

  const [
    sessionData,
    classData,
    sectionData,
    subjectData,
  ] = await Promise.all([
    AcademicSession.findById(
      academicSession
    ).lean(),

    Class.findById(classId).lean(),

    Section.findById(sectionId).lean(),

    Subject.findById(subjectId).lean(),
  ]);

  // ---------------------------------------------------
  // SESSION
  // ---------------------------------------------------

  if (!sessionData) {
    return {
      valid: false,
      status: 404,
      message: "Academic session not found.",
    };
  }

  // ---------------------------------------------------
  // CLASS
  // ---------------------------------------------------

  if (!classData) {
    return {
      valid: false,
      status: 404,
      message: "Class not found.",
    };
  }

  if (
    !sameId(
      classData.academicSession,
      academicSession
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected class does not belong to the selected academic session.",
    };
  }

  // ---------------------------------------------------
  // SECTION
  // ---------------------------------------------------

  if (!sectionData) {
    return {
      valid: false,
      status: 404,
      message: "Section not found.",
    };
  }

  if (
    !sameId(sectionData.class, classId)
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected section does not belong to the selected class.",
    };
  }

  if (
    !sameId(
      sectionData.academicSession,
      academicSession
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected section does not belong to the selected academic session.",
    };
  }

  // ---------------------------------------------------
  // SUBJECT
  // ---------------------------------------------------

  if (!subjectData) {
    return {
      valid: false,
      status: 404,
      message: "Subject not found.",
    };
  }

  if (
    !sameId(
      subjectData.academicSession,
      academicSession
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected subject does not belong to the selected academic session.",
    };
  }

  if (
    !sameId(
      subjectData.class,
      classId
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected subject does not belong to the selected class.",
    };
  }

  if (
    !sameId(
      subjectData.section,
      sectionId
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Selected subject does not belong to the selected section.",
    };
  }

  if (
    subjectData.status &&
    subjectData.status !== "active"
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Attendance cannot be marked for an inactive subject.",
    };
  }

  return {
    valid: true,
    sessionData,
    classData,
    sectionData,
    subjectData,
  };
};

// =====================================================
// VALIDATE STUDENT FOR SECTION
// =====================================================

/**
 * Student must actually belong to the selected:
 *
 * Academic Session
 * Class
 * Section
 *
 * And must have:
 *
 * active Enrollment
 * active Membership
 */
const validateStudentForAttendance = async ({
  studentId,
  academicSession,
  classId,
  sectionId,
}) => {
  if (!isValidObjectId(studentId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid student ID.",
    };
  }

  const student = await User.findOne({
    _id: studentId,
    role: "student",
  })
    .select(
      "_id firstName lastName email phone userId role status parents"
    )
    .lean();

  if (!student) {
    return {
      valid: false,
      status: 404,
      message: "Student not found.",
    };
  }

  if (student.status !== "active") {
    return {
      valid: false,
      status: 422,
      message:
        "Attendance cannot be marked for an inactive student.",
    };
  }

  // ---------------------------------------------------
  // STUDENT PROFILE
  // ---------------------------------------------------

  const studentProfile =
    await StudentProfile.findOne({
      user: studentId,
    })
      .select(
        "currentAcademicSession currentClass currentSection status"
      )
      .lean();

  if (!studentProfile) {
    return {
      valid: false,
      status: 404,
      message:
        "Student profile not found.",
    };
  }

  if (
    studentProfile.status &&
    [
      "withdrawn",
      "suspended",
      "inactive",
    ].includes(studentProfile.status)
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Attendance cannot be marked for this student.",
    };
  }

  // ---------------------------------------------------
  // CURRENT ACADEMIC SNAPSHOT
  // ---------------------------------------------------

  if (
    studentProfile.currentAcademicSession &&
    !sameId(
      studentProfile.currentAcademicSession,
      academicSession
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Student does not belong to the selected academic session.",
    };
  }

  if (
    studentProfile.currentClass &&
    !sameId(
      studentProfile.currentClass,
      classId
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Student does not belong to the selected class.",
    };
  }

  if (
    studentProfile.currentSection &&
    !sameId(
      studentProfile.currentSection,
      sectionId
    )
  ) {
    return {
      valid: false,
      status: 422,
      message:
        "Student does not belong to the selected section.",
    };
  }

  // ---------------------------------------------------
  // ACTIVE ENROLLMENT
  // ---------------------------------------------------

  const enrollment =
    await Enrollment.findOne({
      student: studentId,
      academicSession,
      program:
        (
          await Class.findById(classId)
            .select("program")
            .lean()
        )?.program,
      class: classId,
      section: sectionId,
      status: "active",
    }).lean();

  if (!enrollment) {
    return {
      valid: false,
      status: 422,
      message:
        "Student does not have an active enrollment in the selected section.",
    };
  }

  // ---------------------------------------------------
  // ACTIVE MEMBERSHIP
  // ---------------------------------------------------

  const membership =
    await Membership.findOne({
      student: studentId,
      academicSession,
      enrollment: enrollment._id,
      status: "active",
    }).lean();

  if (!membership) {
    return {
      valid: false,
      status: 422,
      message:
        "Student does not have an active membership for the selected academic session.",
    };
  }

  return {
    valid: true,
    student,
    studentProfile,
    enrollment,
    membership,
  };
};

// =====================================================
// POPULATE ATTENDANCE
// =====================================================

const populateAttendance = async (
  attendance
) => {
  await attendance.populate([
    {
      path: "student",
      select:
        "firstName lastName email phone userId role status",
    },

    {
      path: "academicSession",
      select:
        "name code startDate endDate status",
    },

    {
      path: "class",
      select:
        "name code description status academicSession program",
    },

    {
      path: "section",
      select:
        "name code capacity roomNumber status class academicSession",
    },

    {
      path: "subject",
      select:
        "name code description maxMarks status class section academicSession",
    },

    {
      path: "markedBy",
      select:
        "firstName lastName email role userId",
    },
  ]);

  return attendance;
};

// =====================================================
// CREATE ATTENDANCE
// =====================================================

const createAttendance = async (
  req,
  res
) => {
  try {
    const {
      student,
      academicSession,
      class: classId,
      section,
      subject,
      date,
      status,
      remarks,
    } = req.body;

    // ---------------------------------------------------
    // REQUIRED FIELDS
    // ---------------------------------------------------

    if (
      !student ||
      !academicSession ||
      !classId ||
      !section ||
      !subject ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student, academic session, class, section, subject, date and status are required.",
        errors: [],
      });
    }

    // ---------------------------------------------------
    // STATUS
    // ---------------------------------------------------

    if (
      !ATTENDANCE_STATUSES.includes(
        status
      )
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Invalid attendance status.",
        errors: [],
      });
    }

    // ---------------------------------------------------
    // DATE
    // ---------------------------------------------------

    const normalizedDate =
      normalizeDate(date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance date.",
        errors: [],
      });
    }

    // ---------------------------------------------------
    // ACADEMIC CONTEXT
    // ---------------------------------------------------

    const academicValidation =
      await validateAcademicContext({
        academicSession,
        classId,
        sectionId: section,
        subjectId: subject,
      });

    if (!academicValidation.valid) {
      return res.status(
        academicValidation.status || 422
      ).json({
        success: false,
        message:
          academicValidation.message,
        errors: [],
      });
    }

    // ---------------------------------------------------
    // STUDENT VALIDATION
    // ---------------------------------------------------

    const studentValidation =
      await validateStudentForAttendance({
        studentId: student,
        academicSession,
        classId,
        sectionId: section,
      });

    if (!studentValidation.valid) {
      return res.status(
        studentValidation.status || 422
      ).json({
        success: false,
        message:
          studentValidation.message,
        errors: [],
      });
    }

    // ---------------------------------------------------
    // DUPLICATE CHECK
    // ---------------------------------------------------

    const existingAttendance =
      await Attendance.findOne({
        student,
        class: classId,
        subject,
        date: normalizedDate,
      }).select("_id");

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance for this student, subject, class and date already exists.",
        errors: [],
      });
    }

    // ---------------------------------------------------
    // CREATE
    // ---------------------------------------------------

    const attendance =
      await Attendance.create({
        student,
        academicSession,
        class: classId,
        section,
        subject,
        date: normalizedDate,
        status,
        remarks:
          remarks !== undefined
            ? String(remarks).trim()
            : "",
        markedBy: getUserId(req),
      });

    // ---------------------------------------------------
    // POPULATE
    // ---------------------------------------------------

    await populateAttendance(
      attendance
    );

    // ---------------------------------------------------
    // AUDIT LOG
    // ---------------------------------------------------

    try {
      await createAuditLog({
        req,
        action: "CREATE_ATTENDANCE",
        module: "ATTENDANCE",
        entity: "Attendance",
        entityId: attendance._id,
        metadata: {
          student:
            attendance.student?._id ||
            student,

          academicSession,

          class: classId,

          section,

          subject,

          date: normalizedDate,

          status,
        },
      });
    } catch (auditError) {
      console.error(
        "Attendance audit log failed:",
        auditError.message
      );
    }

    // ---------------------------------------------------
    // NOTIFICATION ON ABSENT
    // ---------------------------------------------------

    if (status === "absent") {
      try {
        const recipients = [];

        if (
          Array.isArray(
            studentValidation.student
              .parents
          )
        ) {
          recipients.push(
            ...studentValidation.student
              .parents
          );
        }

        recipients.push(student);

        await createNotifications({
          recipients,
          type: "attendance",
          title:
            "Attendance marked absent",
          message:
            `${studentValidation.student.firstName} ${
              studentValidation.student.lastName ||
              ""
            }`.trim() +
            " has been marked absent.",

          data: {
            attendanceId:
              attendance._id,

            studentId: student,

            academicSession,

            class: classId,

            section,

            subject,

            date: normalizedDate,

            status,
          },
        });
      } catch (notificationError) {
        console.error(
          "Attendance notification failed:",
          notificationError.message
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Attendance marked successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error(
      "createAttendance error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance for this student, subject, class and date already exists.",
        errors: [],
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark attendance.",
      errors: [error.message],
    });
  }
};

// =====================================================
// GET ATTENDANCES
// =====================================================

const getAttendances = async (
  req,
  res
) => {
  try {
    const {
      student,
      academicSession,
      class: classId,
      section,
      subject,
      date,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // ---------------------------------------------------
    // STUDENT
    // ---------------------------------------------------

    if (student) {
      if (!isValidObjectId(student)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
          errors: [],
        });
      }

      filter.student = student;
    }

    // ---------------------------------------------------
    // SESSION
    // ---------------------------------------------------

    if (academicSession) {
      if (
        !isValidObjectId(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID.",
          errors: [],
        });
      }

      filter.academicSession =
        academicSession;
    }

    // ---------------------------------------------------
    // CLASS
    // ---------------------------------------------------

    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class ID.",
          errors: [],
        });
      }

      filter.class = classId;
    }

    // ---------------------------------------------------
    // SECTION
    // ---------------------------------------------------

    if (section) {
      if (!isValidObjectId(section)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid section ID.",
          errors: [],
        });
      }

      filter.section = section;
    }

    // ---------------------------------------------------
    // SUBJECT
    // ---------------------------------------------------

    if (subject) {
      if (!isValidObjectId(subject)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subject ID.",
          errors: [],
        });
      }

      filter.subject = subject;
    }

    // ---------------------------------------------------
    // EXACT DATE
    // ---------------------------------------------------

    if (date) {
      const normalizedDate =
        normalizeDate(date);

      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date.",
          errors: [],
        });
      }

      filter.date = normalizedDate;
    }

    // ---------------------------------------------------
    // DATE RANGE
    // ---------------------------------------------------

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const normalizedStartDate =
          normalizeDate(startDate);

        if (!normalizedStartDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date.",
            errors: [],
          });
        }

        filter.date.$gte =
          normalizedStartDate;
      }

      if (endDate) {
        const normalizedEndDate =
          normalizeEndDate(endDate);

        if (!normalizedEndDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date.",
            errors: [],
          });
        }

        filter.date.$lte =
          normalizedEndDate;
      }
    }

    // ---------------------------------------------------
    // STATUS
    // ---------------------------------------------------

    if (status) {
      if (
        !ATTENDANCE_STATUSES.includes(
          status
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Invalid attendance status.",
          errors: [],
        });
      }

      filter.status = status;
    }

    // ---------------------------------------------------
    // PAGINATION
    // ---------------------------------------------------

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    // ---------------------------------------------------
    // FETCH
    // ---------------------------------------------------

    const [
      attendances,
      total,
    ] = await Promise.all([
      Attendance.find(filter)
        .populate({
          path: "student",
          select:
            "firstName lastName email phone userId role status",
        })
        .populate({
          path: "academicSession",
          select:
            "name code startDate endDate status",
        })
        .populate({
          path: "class",
          select:
            "name code description status academicSession program",
        })
        .populate({
          path: "section",
          select:
            "name code capacity roomNumber status class academicSession",
        })
        .populate({
          path: "subject",
          select:
            "name code description maxMarks status",
        })
        .populate({
          path: "markedBy",
          select:
            "firstName lastName email role userId",
        })
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Attendance.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Attendance records fetched successfully.",

      data: attendances,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "getAttendances error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance records.",
      errors: [error.message],
    });
  }
};

// =====================================================
// GET ATTENDANCE BY ID
// =====================================================

const getAttendanceById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance ID.",
        errors: [],
      });
    }

    const attendance =
      await Attendance.findById(id)
        .populate({
          path: "student",
          select:
            "firstName lastName email phone userId role status",
        })
        .populate({
          path: "academicSession",
          select:
            "name code startDate endDate status",
        })
        .populate({
          path: "class",
          select:
            "name code description status academicSession program",
        })
        .populate({
          path: "section",
          select:
            "name code capacity roomNumber status class academicSession",
        })
        .populate({
          path: "subject",
          select:
            "name code description maxMarks status class section academicSession",
        })
        .populate({
          path: "markedBy",
          select:
            "firstName lastName email role userId",
        });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message:
          "Attendance record not found.",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Attendance record fetched successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error(
      "getAttendanceById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance record.",
      errors: [error.message],
    });
  }
};

// =====================================================
// UPDATE ATTENDANCE
// =====================================================

const updateAttendance = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance ID.",
        errors: [],
      });
    }

    const attendance =
      await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message:
          "Attendance record not found.",
        errors: [],
      });
    }

    const previousStatus =
      attendance.status;

    const previousRemarks =
      attendance.remarks;

    const previousDate =
      attendance.date;

    // ---------------------------------------------------
    // INPUT
    // ---------------------------------------------------

    const {
      status,
      remarks,
      date,
    } = req.body;

    // ---------------------------------------------------
    // STATUS
    // ---------------------------------------------------

    if (status !== undefined) {
      if (
        !ATTENDANCE_STATUSES.includes(
          status
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Invalid attendance status.",
          errors: [],
        });
      }

      attendance.status = status;
    }

    // ---------------------------------------------------
    // REMARKS
    // ---------------------------------------------------

    if (remarks !== undefined) {
      attendance.remarks =
        String(remarks).trim();
    }

    // ---------------------------------------------------
    // DATE
    // ---------------------------------------------------

    let normalizedDate =
      attendance.date;

    if (date !== undefined) {
      normalizedDate =
        normalizeDate(date);

      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance date.",
          errors: [],
        });
      }

      attendance.date =
        normalizedDate;
    }

    // ---------------------------------------------------
    // VALIDATE CURRENT ACADEMIC CONTEXT
    // ---------------------------------------------------

    const academicValidation =
      await validateAcademicContext({
        academicSession:
          attendance.academicSession,

        classId:
          attendance.class,

        sectionId:
          attendance.section,

        subjectId:
          attendance.subject,
      });

    if (!academicValidation.valid) {
      return res.status(
        academicValidation.status || 422
      ).json({
        success: false,
        message:
          academicValidation.message,
        errors: [],
      });
    }

    // ---------------------------------------------------
    // VALIDATE STUDENT
    // ---------------------------------------------------

    const studentValidation =
      await validateStudentForAttendance({
        studentId:
          attendance.student,

        academicSession:
          attendance.academicSession,

        classId:
          attendance.class,

        sectionId:
          attendance.section,
      });

    if (!studentValidation.valid) {
      return res.status(
        studentValidation.status || 422
      ).json({
        success: false,
        message:
          studentValidation.message,
        errors: [],
      });
    }

    // ---------------------------------------------------
    // DUPLICATE CHECK
    // ---------------------------------------------------

    const duplicate =
      await Attendance.findOne({
        _id: {
          $ne: attendance._id,
        },

        student:
          attendance.student,

        class:
          attendance.class,

        subject:
          attendance.subject,

        date: normalizedDate,
      }).select("_id");

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Another attendance record already exists for this student, subject, class and date.",
        errors: [],
      });
    }

    // ---------------------------------------------------
    // SAVE
    // ---------------------------------------------------

    await attendance.save();

    await populateAttendance(
      attendance
    );

    // ---------------------------------------------------
    // AUDIT
    // ---------------------------------------------------

    try {
      await createAuditLog({
        req,
        action: "UPDATE_ATTENDANCE",
        module: "ATTENDANCE",
        entity: "Attendance",
        entityId: attendance._id,

        metadata: {
          previous: {
            status:
              previousStatus,

            remarks:
              previousRemarks,

            date:
              previousDate,
          },

          updated: {
            status:
              attendance.status,

            remarks:
              attendance.remarks,

            date:
              attendance.date,
          },
        },
      });
    } catch (auditError) {
      console.error(
        "Attendance audit log failed:",
        auditError.message
      );
    }

    // ---------------------------------------------------
    // NOTIFICATION
    // ---------------------------------------------------

    if (
      attendance.status ===
        "absent" &&
      previousStatus !== "absent"
    ) {
      try {
        const studentData =
          await User.findOne({
            _id:
              attendance.student?._id ||
              attendance.student,

            role: "student",
          }).select(
            "_id firstName lastName parents"
          );

        if (studentData) {
          const recipients = [];

          if (
            Array.isArray(
              studentData.parents
            )
          ) {
            recipients.push(
              ...studentData.parents
            );
          }

          recipients.push(
            studentData._id
          );

          await createNotifications({
            recipients,

            type: "attendance",

            title:
              "Attendance marked absent",

            message:
              `${studentData.firstName} ${
                studentData.lastName || ""
              }`.trim() +
              " has been marked absent.",

            data: {
              attendanceId:
                attendance._id,

              studentId:
                studentData._id,

              date:
                attendance.date,

              status:
                attendance.status,
            },
          });
        }
      } catch (notificationError) {
        console.error(
          "Attendance notification failed:",
          notificationError.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Attendance updated successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error(
      "updateAttendance error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance for this student, subject, class and date already exists.",
        errors: [],
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update attendance.",
      errors: [error.message],
    });
  }
};

// =====================================================
// GET STUDENT ATTENDANCE
// =====================================================

const getStudentAttendance = async (
  req,
  res
) => {
  try {
    const { studentId } =
      req.params;

    const {
      academicSession,
      class: classId,
      section,
      subject,
      startDate,
      endDate,
      status,
    } = req.query;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID.",
        errors: [],
      });
    }

    const student =
      await User.findOne({
        _id: studentId,
        role: "student",
      })
        .select(
          "_id firstName lastName email phone userId role status"
        )
        .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found.",
        errors: [],
      });
    }

    const filter = {
      student: studentId,
    };

    // ---------------------------------------------------
    // SESSION
    // ---------------------------------------------------

    if (academicSession) {
      if (
        !isValidObjectId(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID.",
          errors: [],
        });
      }

      filter.academicSession =
        academicSession;
    }

    // ---------------------------------------------------
    // CLASS
    // ---------------------------------------------------

    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class ID.",
          errors: [],
        });
      }

      filter.class = classId;
    }

    // ---------------------------------------------------
    // SECTION
    // ---------------------------------------------------

    if (section) {
      if (!isValidObjectId(section)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid section ID.",
          errors: [],
        });
      }

      filter.section = section;
    }

    // ---------------------------------------------------
    // SUBJECT
    // ---------------------------------------------------

    if (subject) {
      if (!isValidObjectId(subject)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subject ID.",
          errors: [],
        });
      }

      filter.subject = subject;
    }

    // ---------------------------------------------------
    // STATUS
    // ---------------------------------------------------

    if (status) {
      if (
        !ATTENDANCE_STATUSES.includes(
          status
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Invalid attendance status.",
          errors: [],
        });
      }

      filter.status = status;
    }

    // ---------------------------------------------------
    // DATE RANGE
    // ---------------------------------------------------

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const normalizedStartDate =
          normalizeDate(startDate);

        if (!normalizedStartDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date.",
            errors: [],
          });
        }

        filter.date.$gte =
          normalizedStartDate;
      }

      if (endDate) {
        const normalizedEndDate =
          normalizeEndDate(endDate);

        if (!normalizedEndDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date.",
            errors: [],
          });
        }

        filter.date.$lte =
          normalizedEndDate;
      }
    }

    // ---------------------------------------------------
    // FETCH
    // ---------------------------------------------------

    const attendance =
      await Attendance.find(filter)
        .populate({
          path: "academicSession",
          select:
            "name code startDate endDate status",
        })
        .populate({
          path: "class",
          select:
            "name code description status",
        })
        .populate({
          path: "section",
          select:
            "name code capacity roomNumber status",
        })
        .populate({
          path: "subject",
          select:
            "name code description maxMarks status",
        })
        .populate({
          path: "markedBy",
          select:
            "firstName lastName email role userId",
        })
        .sort({
          date: -1,
          createdAt: -1,
        })
        .lean();

    // ---------------------------------------------------
    // STATISTICS
    // ---------------------------------------------------

    const total =
      attendance.length;

    const present =
      attendance.filter(
        (item) =>
          item.status === "present"
      ).length;

    const absent =
      attendance.filter(
        (item) =>
          item.status === "absent"
      ).length;

    const late =
      attendance.filter(
        (item) =>
          item.status === "late"
      ).length;

    const excused =
      attendance.filter(
        (item) =>
          item.status === "excused"
      ).length;

    const attendancePercentage =
      total > 0
        ? Number(
            (
              (present / total) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Student attendance fetched successfully.",

      data: {
        student,

        statistics: {
          total,
          present,
          absent,
          late,
          excused,
          attendancePercentage,
        },

        attendance,
      },
    });
  } catch (error) {
    console.error(
      "getStudentAttendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch student attendance.",
      errors: [error.message],
    });
  }
};

// =====================================================
// ATTENDANCE STATISTICS
// =====================================================

const getAttendanceStatistics = async (
  req,
  res
) => {
  try {
    const {
      student,
      academicSession,
      class: classId,
      section,
      subject,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    // ---------------------------------------------------
    // STUDENT
    // ---------------------------------------------------

    if (student) {
      if (!isValidObjectId(student)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
          errors: [],
        });
      }

      filter.student = student;
    }

    // ---------------------------------------------------
    // SESSION
    // ---------------------------------------------------

    if (academicSession) {
      if (
        !isValidObjectId(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID.",
          errors: [],
        });
      }

      filter.academicSession =
        academicSession;
    }

    // ---------------------------------------------------
    // CLASS
    // ---------------------------------------------------

    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class ID.",
          errors: [],
        });
      }

      filter.class = classId;
    }

    // ---------------------------------------------------
    // SECTION
    // ---------------------------------------------------

    if (section) {
      if (!isValidObjectId(section)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid section ID.",
          errors: [],
        });
      }

      filter.section = section;
    }

    // ---------------------------------------------------
    // SUBJECT
    // ---------------------------------------------------

    if (subject) {
      if (!isValidObjectId(subject)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subject ID.",
          errors: [],
        });
      }

      filter.subject = subject;
    }

    // ---------------------------------------------------
    // DATE RANGE
    // ---------------------------------------------------

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const normalizedStartDate =
          normalizeDate(startDate);

        if (!normalizedStartDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date.",
            errors: [],
          });
        }

        filter.date.$gte =
          normalizedStartDate;
      }

      if (endDate) {
        const normalizedEndDate =
          normalizeEndDate(endDate);

        if (!normalizedEndDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date.",
            errors: [],
          });
        }

        filter.date.$lte =
          normalizedEndDate;
      }
    }

    // ---------------------------------------------------
    // AGGREGATE
    // ---------------------------------------------------

    const statistics =
      await Attendance.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const result = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendancePercentage: 0,
    };

    statistics.forEach((item) => {
      result[item._id] =
        item.count;

      result.total +=
        item.count;
    });

    if (result.total > 0) {
      result.attendancePercentage =
        Number(
          (
            (result.present /
              result.total) *
            100
          ).toFixed(2)
        );
    }

    return res.status(200).json({
      success: true,
      message:
        "Attendance statistics fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "getAttendanceStatistics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance statistics.",
      errors: [error.message],
    });
  }
};

// =====================================================
// GET SECTION STUDENTS FOR ATTENDANCE
// =====================================================

/**
 * This endpoint gives the frontend the actual
 * students who are allowed to receive attendance.
 *
 * Source of truth:
 *
 * Active Enrollment
 * +
 * Active Membership
 *
 * URL:
 *
 * GET /attendance/section/:sectionId/students
 */
const getSectionStudentsForAttendance =
  async (req, res) => {
    try {
      const { sectionId } =
        req.params;

      const {
        academicSession,
        class: classId,
      } = req.query;

      if (
        !isValidObjectId(sectionId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid section ID.",
          errors: [],
        });
      }

      if (
        !isValidObjectId(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Academic session is required.",
          errors: [],
        });
      }

      if (
        !isValidObjectId(classId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Class is required.",
          errors: [],
        });
      }

      // ---------------------------------------------------
      // VALIDATE SECTION
      // ---------------------------------------------------

      const section =
        await Section.findById(
          sectionId
        )
          .populate({
            path: "class",
            select:
              "name code program academicSession",
          })
          .lean();

      if (!section) {
        return res.status(404).json({
          success: false,
          message:
            "Section not found.",
          errors: [],
        });
      }

      if (
        !sameId(
          section.class?._id ||
            section.class,
          classId
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Selected section does not belong to the selected class.",
          errors: [],
        });
      }

      if (
        !sameId(
          section.academicSession,
          academicSession
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Selected section does not belong to the selected academic session.",
          errors: [],
        });
      }

      // ---------------------------------------------------
      // GET ACTIVE ENROLLMENTS
      // ---------------------------------------------------

      const enrollments =
        await Enrollment.find({
          academicSession,
          class: classId,
          section: sectionId,
          status: "active",
        })
          .populate({
            path: "student",
            select:
              "firstName lastName email phone userId role status",
          })
          .lean();

      if (!enrollments.length) {
        return res.status(200).json({
          success: true,
          message:
            "No active students found in this section.",
          count: 0,
          students: [],
        });
      }

      const studentIds =
        enrollments
          .map(
            (enrollment) =>
              enrollment.student?._id
          )
          .filter(Boolean);

      // ---------------------------------------------------
      // ACTIVE MEMBERSHIPS
      // ---------------------------------------------------

      const memberships =
        await Membership.find({
          student: {
            $in: studentIds,
          },

          academicSession,

          status: "active",
        })
          .select(
            "student membershipName membershipCode startDate endDate amount status"
          )
          .lean();

      const membershipMap =
        new Map(
          memberships.map(
            (membership) => [
              String(
                membership.student
              ),
              membership,
            ]
          )
        );

      // ---------------------------------------------------
      // ONLY STUDENTS WITH ACTIVE MEMBERSHIP
      // ---------------------------------------------------

      const students =
        enrollments
          .filter(
            (enrollment) =>
              enrollment.student &&
              enrollment.student.status ===
                "active" &&
              membershipMap.has(
                String(
                  enrollment.student._id
                )
              )
          )
          .map((enrollment) => ({
            ...enrollment.student,

            enrollment: {
              _id: enrollment._id,

              enrollmentDate:
                enrollment.enrollmentDate,

              rollNumber:
                enrollment.rollNumber,

              status:
                enrollment.status,
            },

            membership:
              membershipMap.get(
                String(
                  enrollment.student._id
                )
              ),
          }));

      return res.status(200).json({
        success: true,
        message:
          "Section students fetched successfully.",

        count: students.length,

        students,
      });
    } catch (error) {
      console.error(
        "getSectionStudentsForAttendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch section students.",
        errors: [error.message],
      });
    }
  };

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  getStudentAttendance,
  getAttendanceStatistics,
  getSectionStudentsForAttendance,
};