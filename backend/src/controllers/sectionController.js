const mongoose = require("mongoose");

const Section = require("../models/Section");
const Class = require("../models/Class");
const AcademicSession = require("../models/AcademicSession");
const Membership = require("../models/Membership");
const StudentProfile = require("../models/StudentProfile");

/**
 * Create Section
 */
const createSection = async (req, res) => {
  try {
    const {
      class: classId,
      academicSession,
      name,
      code,
      capacity,
      roomNumber,
      status,
    } = req.body;

    if (!classId || !academicSession || !name || !code) {
      return res.status(400).json({
        success: false,
        message:
          "Class, academic session, name and code are required",
      });
    }

    if (
      !mongoose.isValidObjectId(classId) ||
      !mongoose.isValidObjectId(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid class or academic session ID",
      });
    }

    const classExists = await Class.findById(classId);

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const sessionExists = await AcademicSession.findById(
      academicSession
    );

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    /**
     * Class and academic session must match.
     */
    if (
      classExists.academicSession.toString() !==
      academicSession.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Class does not belong to this academic session",
      });
    }

    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toUpperCase();

    /**
     * Prevent duplicate section name
     * inside the same class + academic session.
     */
    const existing = await Section.findOne({
      class: classId,
      academicSession,
      name: normalizedName,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Section already exists",
      });
    }

    const section = await Section.create({
      class: classId,
      academicSession,
      name: normalizedName,
      code: normalizedCode,
      capacity:
        capacity === "" ||
        capacity === null ||
        capacity === undefined
          ? null
          : Number(capacity),
      roomNumber: String(roomNumber || "").trim(),
      status: status || "active",
    });

    const populatedSection = await Section.findById(section._id)
      .populate("class", "name code")
      .populate("academicSession", "name code");

    return res.status(201).json({
      success: true,
      message: "Section created successfully",
      section: populatedSection,
    });
  } catch (error) {
    console.error("Create section error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Section with this name or code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create section",
      error: error.message,
    });
  }
};

/**
 * Get Sections
 */
const getSections = async (req, res) => {
  try {
    const filter = {};

    if (req.query.class) {
      if (!mongoose.isValidObjectId(req.query.class)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      filter.class = req.query.class;
    }

    if (req.query.academicSession) {
      if (!mongoose.isValidObjectId(req.query.academicSession)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID",
        });
      }

      filter.academicSession = req.query.academicSession;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const sections = await Section.find(filter)
      .populate("class", "name code")
      .populate("academicSession", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sections.length,
      sections,
    });
  } catch (error) {
    console.error("Get sections error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sections",
      error: error.message,
    });
  }
};

/**
 * Get Section By ID
 */
const getSectionById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    const section = await Section.findById(req.params.id)
      .populate("class", "name code")
      .populate("academicSession", "name code");

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    return res.status(200).json({
      success: true,
      section,
    });
  } catch (error) {
    console.error("Get section by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch section",
      error: error.message,
    });
  }
};

/**
 * Get Students Of Section
 *
 * Source of truth:
 * Membership.status === "active"
 * Enrollment.status === "active"
 *
 * Student must belong to:
 * - selected academic session
 * - selected class
 * - selected section
 */
const getSectionStudents = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    const section = await Section.findById(id)
      .populate("class", "name code")
      .populate("academicSession", "name code");

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const classId =
      section.class?._id || section.class;

    const academicSessionId =
      section.academicSession?._id ||
      section.academicSession;

    /**
     * Only active memberships.
     */
    const memberships = await Membership.find({
      status: "active",
      academicSession: academicSessionId,
    })
      .populate(
        "student",
        "firstName lastName email phone userId status"
      )
      .populate({
        path: "enrollment",
        select:
          "student academicSession program class section enrollmentDate rollNumber status",
        populate: [
          {
            path: "program",
            select: "name code",
          },
          {
            path: "class",
            select: "name code",
          },
          {
            path: "section",
            select: "name code capacity roomNumber",
          },
        ],
      })
      .populate(
        "academicSession",
        "name code startDate endDate status"
      )
      .sort({ createdAt: 1 });

    /**
     * Filter using Enrollment.
     */
    const sectionMemberships = memberships.filter(
      (membership) => {
        const enrollment = membership.enrollment;

        if (!enrollment) {
          return false;
        }

        if (enrollment.status !== "active") {
          return false;
        }

        if (!enrollment.class || !enrollment.section) {
          return false;
        }

        const enrollmentClassId =
          enrollment.class._id ||
          enrollment.class;

        const enrollmentSectionId =
          enrollment.section._id ||
          enrollment.section;

        const enrollmentSessionId =
          enrollment.academicSession?._id ||
          enrollment.academicSession;

        return (
          enrollmentClassId?.toString() ===
            classId?.toString() &&
          enrollmentSectionId?.toString() ===
            section._id.toString() &&
          enrollmentSessionId?.toString() ===
            academicSessionId?.toString()
        );
      }
    );

    /**
     * Student profile information.
     */
    const studentIds = sectionMemberships
      .map(
        (membership) =>
          membership.student?._id
      )
      .filter(Boolean);

    const studentProfiles =
      await StudentProfile.find({
        user: {
          $in: studentIds,
        },
      }).select(
        "user dateOfBirth gender address city state postalCode admissionDate status"
      );

    const profileMap = new Map();

    studentProfiles.forEach((profile) => {
      profileMap.set(
        profile.user.toString(),
        profile
      );
    });

    const students = sectionMemberships.map(
      (membership) => {
        const student = membership.student;
        const enrollment =
          membership.enrollment;

        const profile = student?._id
          ? profileMap.get(
              student._id.toString()
            )
          : null;

        return {
          membershipId: membership._id,

          membership: {
            id: membership._id,
            code: membership.membershipCode,
            name: membership.membershipName,
            status: membership.status,
            startDate: membership.startDate,
            endDate: membership.endDate,
            amount: membership.amount,
          },

          student: student
            ? {
                id: student._id,
                studentId: student.userId,
                firstName: student.firstName,
                lastName: student.lastName,
                fullName:
                  `${student.firstName || ""} ${
                    student.lastName || ""
                  }`.trim(),
                email: student.email,
                phone: student.phone,
                status: student.status,
              }
            : null,

          profile: profile
            ? {
                dateOfBirth:
                  profile.dateOfBirth,
                gender: profile.gender,
                address: profile.address,
                city: profile.city,
                state: profile.state,
                postalCode:
                  profile.postalCode,
                admissionDate:
                  profile.admissionDate,
                status: profile.status,
              }
            : null,

          enrollment: {
            id: enrollment._id,
            rollNumber:
              enrollment.rollNumber,
            enrollmentDate:
              enrollment.enrollmentDate,
            status: enrollment.status,

            program: enrollment.program
              ? {
                  id: enrollment.program._id,
                  name: enrollment.program.name,
                  code: enrollment.program.code,
                }
              : null,

            class: enrollment.class
              ? {
                  id: enrollment.class._id,
                  name: enrollment.class.name,
                  code: enrollment.class.code,
                }
              : null,

            section: enrollment.section
              ? {
                  id: enrollment.section._id,
                  name: enrollment.section.name,
                  code: enrollment.section.code,
                  capacity:
                    enrollment.section
                      .capacity,
                  roomNumber:
                    enrollment.section
                      .roomNumber,
                }
              : null,
          },
        };
      }
    );

    const capacity =
      section.capacity === null ||
      section.capacity === undefined
        ? null
        : Number(section.capacity);

    const studentCount =
      students.length;

    return res.status(200).json({
      success: true,

      section: {
        id: section._id,
        name: section.name,
        code: section.code,
        capacity,
        roomNumber:
          section.roomNumber,
        status: section.status,

        class: section.class
          ? {
              id: section.class._id,
              name: section.class.name,
              code: section.class.code,
            }
          : null,

        academicSession:
          section.academicSession
            ? {
                id: section
                  .academicSession
                  ._id,
                name: section
                  .academicSession
                  .name,
                code: section
                  .academicSession
                  .code,
              }
            : null,
      },

      count: studentCount,

      availableSeats:
        capacity === null
          ? null
          : Math.max(
              capacity - studentCount,
              0
            ),

      students,
    });
  } catch (error) {
    console.error(
      "Get section students error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch section students",
      error: error.message,
    });
  }
};

/**
 * Update Section
 */
const updateSection = async (req, res) => {
  try {
    const {
      class: classId,
      academicSession,
      name,
      code,
      capacity,
      roomNumber,
      status,
    } = req.body;

    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    const section =
      await Section.findById(
        req.params.id
      );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const finalClassId =
      classId !== undefined
        ? classId
        : section.class;

    const finalAcademicSession =
      academicSession !== undefined
        ? academicSession
        : section.academicSession;

    if (
      !mongoose.isValidObjectId(
        finalClassId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    if (
      !mongoose.isValidObjectId(
        finalAcademicSession
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid academic session ID",
      });
    }

    const classExists =
      await Class.findById(
        finalClassId
      );

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const sessionExists =
      await AcademicSession.findById(
        finalAcademicSession
      );

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message:
          "Academic session not found",
      });
    }

    /**
     * Class and academic session
     * must belong together.
     */
    if (
      classExists.academicSession.toString() !==
      finalAcademicSession.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Class does not belong to this academic session",
      });
    }

    section.class =
      finalClassId;

    section.academicSession =
      finalAcademicSession;

    if (name !== undefined) {
      section.name =
        String(name).trim();
    }

    if (code !== undefined) {
      section.code =
        String(code)
          .trim()
          .toUpperCase();
    }

    if (capacity !== undefined) {
      section.capacity =
        capacity === "" ||
        capacity === null
          ? null
          : Number(capacity);
    }

    if (roomNumber !== undefined) {
      section.roomNumber =
        String(roomNumber).trim();
    }

    if (status !== undefined) {
      section.status = status;
    }

    /**
     * Prevent duplicate name/code.
     */
    const duplicate =
      await Section.findOne({
        _id: {
          $ne: section._id,
        },
        class: section.class,
        academicSession:
          section.academicSession,
        $or: [
          {
            name: section.name,
          },
          {
            code: section.code,
          },
        ],
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Another section with the same name or code already exists",
      });
    }

    await section.save();

    const updatedSection =
      await Section.findById(
        section._id
      )
        .populate(
          "class",
          "name code"
        )
        .populate(
          "academicSession",
          "name code"
        );

    return res.status(200).json({
      success: true,
      message:
        "Section updated successfully",
      section: updatedSection,
    });
  } catch (error) {
    console.error(
      "Update section error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Section with this name or code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update section",
      error: error.message,
    });
  }
};

/**
 * Delete Section
 */
const deleteSection = async (req, res) => {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    const section =
      await Section.findById(
        req.params.id
      );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    /**
     * Find active memberships
     * for this academic session.
     */
    const activeMemberships =
      await Membership.find({
        status: "active",
        academicSession:
          section.academicSession,
      }).populate({
        path: "enrollment",
        select:
          "class section academicSession status",
      });

    /**
     * Check whether this section
     * still has active students.
     */
    const hasActiveStudents =
      activeMemberships.some(
        (membership) => {
          const enrollment =
            membership.enrollment;

          if (
            !enrollment ||
            enrollment.status !==
              "active"
          ) {
            return false;
          }

          return (
            enrollment.section
              ?.toString() ===
              section._id.toString() &&
            enrollment.class
              ?.toString() ===
              section.class.toString() &&
            enrollment.academicSession
              ?.toString() ===
              section.academicSession.toString()
          );
        }
      );

    if (hasActiveStudents) {
      return res.status(409).json({
        success: false,
        message:
          "This section cannot be deleted because it has active students. Deactivate or transfer the active students first.",
      });
    }

    await section.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Section deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete section error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete section",
      error: error.message,
    });
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  getSectionStudents,
  updateSection,
  deleteSection,
};