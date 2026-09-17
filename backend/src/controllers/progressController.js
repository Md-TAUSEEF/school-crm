const mongoose = require("mongoose");

const Progress = require("../models/Progress");
const User = require("../models/User");
const AcademicSession = require("../models/AcademicSession");
const StudentProfile = require("../models/StudentProfile");
const Schedule = require("../models/Schedule");

const { createAuditLog } = require("../services/auditLogService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const getUserId = (req) => req.user?._id || req.user?.id;

const getUserRole = (req) =>
  String(req.user?.role || "").toLowerCase();

const isAdmin = (req) => getUserRole(req) === "admin";

const isTeacher = (req) => getUserRole(req) === "teacher";

/**
 * Check whether a teacher is assigned to
 * academic session + class + section.
 *
 * section = null means teacher has access
 * to the complete class.
 */
const teacherHasClassAccess = async ({
  teacherId,
  academicSession,
  classId,
  sectionId,
}) => {
  if (
    !isValidObjectId(teacherId) ||
    !isValidObjectId(academicSession) ||
    !isValidObjectId(classId)
  ) {
    return false;
  }

  const query = {
    instructor: teacherId,
    academicSession,
    class: classId,
    status: "active",
  };

  if (sectionId && isValidObjectId(sectionId)) {
    query.$or = [
      { section: sectionId },
      { section: null },
    ];
  } else {
    query.section = null;
  }

  const schedule = await Schedule.findOne(query).select("_id");

  return Boolean(schedule);
};

/**
 * Check whether a teacher can access a particular student.
 *
 * Student's current class/section is taken from StudentProfile.
 */
const teacherHasStudentAccess = async ({
  teacherId,
  studentId,
  academicSession = null,
}) => {
  if (
    !isValidObjectId(teacherId) ||
    !isValidObjectId(studentId)
  ) {
    return false;
  }

  const studentProfile = await StudentProfile.findOne({
    user: studentId,
    status: {
      $nin: ["withdrawn", "suspended"],
    },
  }).select(
    "currentAcademicSession currentClass currentSection status"
  );

  if (!studentProfile) {
    return false;
  }

  const sessionId =
    academicSession ||
    studentProfile.currentAcademicSession;

  if (!sessionId || !studentProfile.currentClass) {
    return false;
  }

  return teacherHasClassAccess({
    teacherId,
    academicSession: sessionId,
    classId: studentProfile.currentClass,
    sectionId: studentProfile.currentSection,
  });
};

/**
 * Get all student IDs currently assigned to a teacher
 * through active schedules.
 */
const getTeacherStudentIds = async (teacherId) => {
  if (!isValidObjectId(teacherId)) {
    return [];
  }

  const schedules = await Schedule.find({
    instructor: teacherId,
    status: "active",
  }).select(
    "academicSession class section"
  );

  if (!schedules.length) {
    return [];
  }

  const conditions = schedules.map((schedule) => {
    const condition = {
      currentAcademicSession:
        schedule.academicSession,

      currentClass: schedule.class,

      status: {
        $nin: ["withdrawn", "suspended"],
      },
    };

    if (schedule.section) {
      condition.currentSection = schedule.section;
    }

    return condition;
  });

  const studentProfiles = await StudentProfile.find({
    $or: conditions,
  }).select("user");

  return studentProfiles.map(
    (profile) => profile.user
  );
};

/**
 * CREATE PROGRESS
 */
const createProgress = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      skillLevel,
      beltRank,
      assessment,
      strengths,
      weaknesses,
      instructorComments,
      nextGoals,
      assessmentDate,
    } = req.body;

    if (
      !student ||
      !academicSession ||
      !assessmentDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "student, academicSession and assessmentDate are required",
        errors: [],
      });
    }

    if (
      !isValidObjectId(student) ||
      !isValidObjectId(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student or academic session",
        errors: [],
      });
    }

    const normalizedAssessmentDate =
      normalizeDate(assessmentDate);

    if (!normalizedAssessmentDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment date",
        errors: [],
      });
    }

    const studentUser = await User.findOne({
      _id: student,
      role: "student",
    }).select(
      "_id firstName lastName email userId"
    );

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
        errors: [],
      });
    }

    const session = await AcademicSession.findById(
      academicSession
    ).select("_id name code");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        errors: [],
      });
    }

    /**
     * Teacher can only create progress
     * for assigned students.
     */
    if (isTeacher(req)) {
      const allowed =
        await teacherHasStudentAccess({
          teacherId: getUserId(req),
          studentId: student,
          academicSession,
        });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to add progress for this student",
          errors: [],
        });
      }
    }

    const progress = await Progress.create({
      student,
      academicSession,

      skillLevel:
        skillLevel?.trim() || "",

      beltRank:
        beltRank?.trim() || "",

      assessment:
        assessment?.trim() || "",

      strengths:
        strengths?.trim() || "",

      weaknesses:
        weaknesses?.trim() || "",

      instructorComments:
        instructorComments?.trim() || "",

      nextGoals:
        nextGoals?.trim() || "",

      assessmentDate:
        normalizedAssessmentDate,

      assessedBy: getUserId(req),
    });

    const populatedProgress =
      await Progress.findById(progress._id)
        .populate(
          "student",
          "firstName lastName email userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "assessedBy",
          "firstName lastName email userId role"
        );

    await createAuditLog({
      userId: getUserId(req),
      req,
      action: "PROGRESS_CREATE",
      entity: "Progress",
      entityId: progress._id,
      metadata: {
        student,
        academicSession,
        beltRank: beltRank || "",
      },
    });

    if (beltRank?.trim()) {
      await createAuditLog({
        userId: getUserId(req),
        req,
        action: "BELT_PROMOTION",
        entity: "Progress",
        entityId: progress._id,
        metadata: {
          student,
          beltRank: beltRank.trim(),
          type: "CREATE",
        },
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Progress record created successfully",
      data: populatedProgress,
    });
  } catch (error) {
    console.error(
      "createProgress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create progress record",
      errors: [],
    });
  }
};

/**
 * GET ALL PROGRESS RECORDS
 */
const getProgressRecords = async (req, res) => {
  try {
    const {
      student,
      academicSession,
      skillLevel,
      beltRank,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (student) {
      if (!isValidObjectId(student)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
          errors: [],
        });
      }

      if (isTeacher(req)) {
        const allowed =
          await teacherHasStudentAccess({
            teacherId: getUserId(req),
            studentId: student,
            academicSession:
              academicSession || null,
          });

        if (!allowed) {
          return res.status(403).json({
            success: false,
            message:
              "You are not authorized to view this student's progress",
            errors: [],
          });
        }
      }

      filter.student = student;
    }

    if (academicSession) {
      if (!isValidObjectId(academicSession)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID",
          errors: [],
        });
      }

      filter.academicSession =
        academicSession;
    }

    if (skillLevel) {
      filter.skillLevel = skillLevel;
    }

    if (beltRank) {
      filter.beltRank = beltRank;
    }

    if (startDate || endDate) {
      filter.assessmentDate = {};

      if (startDate) {
        const normalizedStart =
          normalizeDate(startDate);

        if (!normalizedStart) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
            errors: [],
          });
        }

        filter.assessmentDate.$gte =
          normalizedStart;
      }

      if (endDate) {
        const normalizedEnd =
          normalizeDate(endDate);

        if (!normalizedEnd) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
            errors: [],
          });
        }

        normalizedEnd.setHours(
          23,
          59,
          59,
          999
        );

        filter.assessmentDate.$lte =
          normalizedEnd;
      }
    }

    /**
     * Teacher without a specific student:
     * return only assigned students.
     */
    if (isTeacher(req) && !student) {
      const teacherStudentIds =
        await getTeacherStudentIds(
          getUserId(req)
        );

      if (!teacherStudentIds.length) {
        return res.status(200).json({
          success: true,
          message:
            "Progress records fetched successfully",
          data: {
            items: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              pages: 0,
            },
          },
        });
      }

      filter.student = {
        $in: teacherStudentIds,
      };
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [items, total] =
      await Promise.all([
        Progress.find(filter)
          .populate(
            "student",
            "firstName lastName email userId"
          )
          .populate(
            "academicSession",
            "name code"
          )
          .populate(
            "assessedBy",
            "firstName lastName email userId role"
          )
          .sort({
            assessmentDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber),

        Progress.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      message:
        "Progress records fetched successfully",
      data: {
        items,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(
            total / limitNumber
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "getProgressRecords error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch progress records",
      errors: [],
    });
  }
};

/**
 * GET PROGRESS BY ID
 */
const getProgressById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress ID",
        errors: [],
      });
    }

    const progress =
      await Progress.findById(id)
        .populate(
          "student",
          "firstName lastName email userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "assessedBy",
          "firstName lastName email userId role"
        );

    if (!progress) {
      return res.status(404).json({
        success: false,
        message:
          "Progress record not found",
        errors: [],
      });
    }

    if (isTeacher(req)) {
      const allowed =
        await teacherHasStudentAccess({
          teacherId: getUserId(req),
          studentId: progress.student._id,
          academicSession:
            progress.academicSession._id,
        });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this progress record",
          errors: [],
        });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Progress record fetched successfully",
      data: progress,
    });
  } catch (error) {
    console.error(
      "getProgressById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch progress record",
      errors: [],
    });
  }
};

/**
 * GET STUDENT PROGRESS
 */
const getStudentProgress = async (
  req,
  res
) => {
  try {
    const { studentId } = req.params;

    const {
      academicSession,
      page = 1,
      limit = 10,
    } = req.query;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
        errors: [],
      });
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    }).select(
      "_id firstName lastName email userId"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
        errors: [],
      });
    }

    if (academicSession) {
      if (!isValidObjectId(academicSession)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID",
          errors: [],
        });
      }
    }

    if (isTeacher(req)) {
      const allowed =
        await teacherHasStudentAccess({
          teacherId: getUserId(req),
          studentId,
          academicSession:
            academicSession || null,
        });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this student's progress",
          errors: [],
        });
      }
    }

    const filter = {
      student: studentId,
    };

    if (academicSession) {
      filter.academicSession =
        academicSession;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [items, total] =
      await Promise.all([
        Progress.find(filter)
          .populate(
            "academicSession",
            "name code"
          )
          .populate(
            "assessedBy",
            "firstName lastName email userId role"
          )
          .sort({
            assessmentDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber),

        Progress.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      message:
        "Student progress fetched successfully",
      data: {
        student,
        items,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(
            total / limitNumber
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "getStudentProgress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch student progress",
      errors: [],
    });
  }
};

/**
 * UPDATE PROGRESS
 */
const updateProgress = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress ID",
        errors: [],
      });
    }

    const progress =
      await Progress.findById(id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message:
          "Progress record not found",
        errors: [],
      });
    }

    /**
     * Teacher must have access to the
     * existing progress record.
     */
    if (isTeacher(req)) {
      const allowed =
        await teacherHasStudentAccess({
          teacherId: getUserId(req),
          studentId: progress.student,
          academicSession:
            progress.academicSession,
        });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to update this progress record",
          errors: [],
        });
      }
    }

    const previous = {
      academicSession:
        progress.academicSession,

      skillLevel:
        progress.skillLevel,

      beltRank:
        progress.beltRank,

      assessment:
        progress.assessment,

      strengths:
        progress.strengths,

      weaknesses:
        progress.weaknesses,

      instructorComments:
        progress.instructorComments,

      nextGoals:
        progress.nextGoals,

      assessmentDate:
        progress.assessmentDate,
    };

    const {
      academicSession,
      skillLevel,
      beltRank,
      assessment,
      strengths,
      weaknesses,
      instructorComments,
      nextGoals,
      assessmentDate,
    } = req.body;

    const nextAcademicSession =
      academicSession ||
      progress.academicSession;

    /**
     * If teacher changes academic session,
     * verify access again.
     */
    if (isTeacher(req)) {
      const allowed =
        await teacherHasStudentAccess({
          teacherId: getUserId(req),
          studentId: progress.student,
          academicSession:
            nextAcademicSession,
        });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized for the selected academic session",
          errors: [],
        });
      }
    }

    if (academicSession !== undefined) {
      if (
        !isValidObjectId(
          academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid academic session ID",
          errors: [],
        });
      }

      const session =
        await AcademicSession.findById(
          academicSession
        ).select("_id");

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Academic session not found",
          errors: [],
        });
      }

      progress.academicSession =
        academicSession;
    }

    if (skillLevel !== undefined) {
      progress.skillLevel =
        skillLevel?.trim() || "";
    }

    if (beltRank !== undefined) {
      progress.beltRank =
        beltRank?.trim() || "";
    }

    if (assessment !== undefined) {
      progress.assessment =
        assessment?.trim() || "";
    }

    if (strengths !== undefined) {
      progress.strengths =
        strengths?.trim() || "";
    }

    if (weaknesses !== undefined) {
      progress.weaknesses =
        weaknesses?.trim() || "";
    }

    if (
      instructorComments !==
      undefined
    ) {
      progress.instructorComments =
        instructorComments?.trim() || "";
    }

    if (nextGoals !== undefined) {
      progress.nextGoals =
        nextGoals?.trim() || "";
    }

    if (assessmentDate !== undefined) {
      const normalizedAssessmentDate =
        normalizeDate(
          assessmentDate
        );

      if (!normalizedAssessmentDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid assessment date",
          errors: [],
        });
      }

      progress.assessmentDate =
        normalizedAssessmentDate;
    }

    await progress.save();

    const populatedProgress =
      await Progress.findById(progress._id)
        .populate(
          "student",
          "firstName lastName email userId"
        )
        .populate(
          "academicSession",
          "name code"
        )
        .populate(
          "assessedBy",
          "firstName lastName email userId role"
        );

    await createAuditLog({
      userId: getUserId(req),
      req,
      action: "PROGRESS_UPDATE",
      entity: "Progress",
      entityId: progress._id,
      metadata: {
        previous,

        updated: {
          academicSession:
            progress.academicSession,

          skillLevel:
            progress.skillLevel,

          beltRank:
            progress.beltRank,

          assessment:
            progress.assessment,

          strengths:
            progress.strengths,

          weaknesses:
            progress.weaknesses,

          instructorComments:
            progress.instructorComments,

          nextGoals:
            progress.nextGoals,

          assessmentDate:
            progress.assessmentDate,
        },
      },
    });

    /**
     * Belt changed.
     */
    if (
      progress.beltRank &&
      progress.beltRank !==
        previous.beltRank
    ) {
      await createAuditLog({
        userId: getUserId(req),
        req,
        action: "BELT_PROMOTION",
        entity: "Progress",
        entityId: progress._id,
        metadata: {
          student: progress.student,
          previousBelt:
            previous.beltRank,
          newBelt:
            progress.beltRank,
          type: "UPDATE",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Progress record updated successfully",
      data: populatedProgress,
    });
  } catch (error) {
    console.error(
      "updateProgress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update progress record",
      errors: [],
    });
  }
};

module.exports = {
  createProgress,
  getProgressRecords,
  getProgressById,
  getStudentProgress,
  updateProgress,
};