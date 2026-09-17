
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");

const generateUniqueId = require("../utils/generateUniqueId");
const { createAuditLog } = require("../services/auditLogService");

/**
 * CREATE STUDENT
 *
 * Student creation only handles the basic student profile.
 *
 * Academic assignment is NOT handled here.
 *
 * Academic placement flow:
 * Student
 *   ↓
 * Guardian
 *   ↓
 * Admission
 *   ↓
 * Approval
 *   ↓
 * Enrollment
 *   ↓
 * Current academic snapshot in StudentProfile
 */
const createStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      postalCode,
      admissionDate,
      status,
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }

    if (!lastName || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Last name is required",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // --------------------------------------------------
    // NORMALIZE INPUT
    // --------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // --------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (existingUser.phone === normalizedPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Student already exists",
      });
    }

    // --------------------------------------------------
    // PASSWORD HASH
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 12);

    // --------------------------------------------------
    // GENERATE STUDENT ID
    // --------------------------------------------------

   const userId = await generateUniqueId("student");

    // --------------------------------------------------
    // CREATE USER
    // --------------------------------------------------

    const student = await User.create({
      userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "student",
      status: status || "active",
    });

    // --------------------------------------------------
    // CREATE STUDENT PROFILE
    //
    // IMPORTANT:
    // currentAcademicSession
    // currentClass
    // currentSection
    //
    // are intentionally NOT assigned here.
    //
    // They will be updated through:
    //
    // Admission → Approval → Enrollment
    // --------------------------------------------------

    const studentProfile = await StudentProfile.create({
      user: student._id,

      dateOfBirth: dateOfBirth || null,

      gender: gender || "",

      address: address ? address.trim() : "",

      city: city ? city.trim() : "",

      state: state ? state.trim() : "",

      postalCode: postalCode ? postalCode.trim() : "",

      admissionDate: admissionDate || null,

      status: status || "active",
    });

    // --------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------

    await createAuditLog({
      user: req.user?._id || null,
      action: "CREATE",
      module: "STUDENT",
      description: `Student ${student.userId} created`,
      metadata: {
        studentId: student._id,
        userId: student.userId,
      },
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: {
        ...student.toObject(),
        profile: studentProfile,
      },
    });
  } catch (error) {
    console.error("Create student error:", error);

    // Duplicate key safety
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: duplicateField
          ? `${duplicateField} already exists`
          : "Student already exists",
        errors: [error.message],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create student",
      errors: [error.message],
    });
  }
};

/**
 * GET ALL STUDENTS
 *
 * Academic snapshot is still populated because other modules
 * such as Attendance / Progress may use the current placement.
 *
 * Student creation/update does NOT manage these fields.
 */
const getStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: "student",
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const studentIds = students.map((student) => student._id);

    const profiles = await StudentProfile.find({
      user: { $in: studentIds },
    })
      .populate(
        "currentAcademicSession",
        "name code startDate endDate status"
      )
      .populate(
        "currentClass",
        "name code description status"
      )
      .populate(
        "currentSection",
        "name code capacity roomNumber status"
      )
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [
        String(profile.user),
        profile,
      ])
    );

    const result = students.map((student) => ({
      ...student,
      profile: profileMap.get(String(student._id)) || null,
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      students: result,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      errors: [error.message],
    });
  }
};

/**
 * GET STUDENT BY ID
 */
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const student = await User.findOne({
      _id: id,
      role: "student",
    })
      .select("-password")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const profile = await StudentProfile.findOne({
      user: student._id,
    })
      .populate(
        "currentAcademicSession",
        "name code startDate endDate status"
      )
      .populate(
        "currentClass",
        "name code description status"
      )
      .populate(
        "currentSection",
        "name code capacity roomNumber status"
      )
      .lean();

    return res.status(200).json({
      success: true,
      student: {
        ...student,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error("Get student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student",
      errors: [error.message],
    });
  }
};

/**
 * UPDATE STUDENT
 *
 * Only basic student/user/profile information is updated here.
 *
 * Academic assignment is intentionally excluded.
 *
 * Academic placement must happen through:
 * Admission → Approval → Enrollment
 */
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const student = await User.findOne({
      _id: id,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      postalCode,
      admissionDate,
      status,
    } = req.body;

    // --------------------------------------------------
    // DUPLICATE EMAIL / PHONE CHECK
    // --------------------------------------------------

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const existingEmailUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: student._id },
      });

      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      student.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const normalizedPhone = phone.trim();

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      const existingPhoneUser = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: student._id },
      });

      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
        });
      }

      student.phone = normalizedPhone;
    }

    // --------------------------------------------------
    // USER FIELDS
    // --------------------------------------------------

    if (firstName !== undefined) {
      if (!firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name cannot be empty",
        });
      }

      student.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Last name cannot be empty",
        });
      }

      student.lastName = lastName.trim();
    }

    if (status !== undefined) {
      student.status = status;
    }

    // --------------------------------------------------
    // PASSWORD
    // --------------------------------------------------

    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      student.password = await bcrypt.hash(password, 12);
    }

    await student.save();

    // --------------------------------------------------
    // GET / CREATE PROFILE
    // --------------------------------------------------

    let profile = await StudentProfile.findOne({
      user: student._id,
    });

    if (!profile) {
      profile = new StudentProfile({
        user: student._id,
      });
    }

    // --------------------------------------------------
    // PROFILE FIELDS
    // --------------------------------------------------

    if (dateOfBirth !== undefined) {
      profile.dateOfBirth = dateOfBirth || null;
    }

    if (gender !== undefined) {
      profile.gender = gender || "";
    }

    if (address !== undefined) {
      profile.address = address ? address.trim() : "";
    }

    if (city !== undefined) {
      profile.city = city ? city.trim() : "";
    }

    if (state !== undefined) {
      profile.state = state ? state.trim() : "";
    }

    if (postalCode !== undefined) {
      profile.postalCode = postalCode
        ? postalCode.trim()
        : "";
    }

    if (admissionDate !== undefined) {
      profile.admissionDate = admissionDate || null;
    }

    if (status !== undefined) {
      profile.status = status;
    }

    // --------------------------------------------------
    // IMPORTANT
    //
    // Do NOT update:
    //
    // profile.currentAcademicSession
    // profile.currentClass
    // profile.currentSection
    //
    // Those belong to Admission / Enrollment.
    // --------------------------------------------------

    await profile.save();

    // --------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------

    await createAuditLog({
      user: req.user?._id || null,
      action: "UPDATE",
      module: "STUDENT",
      description: `Student ${student.userId} updated`,
      metadata: {
        studentId: student._id,
        userId: student.userId,
      },
    });

    // --------------------------------------------------
    // RESPONSE WITH CURRENT ACADEMIC SNAPSHOT
    // --------------------------------------------------

    const updatedStudent = await User.findById(student._id)
      .select("-password")
      .lean();

    const updatedProfile = await StudentProfile.findOne({
      user: student._id,
    })
      .populate(
        "currentAcademicSession",
        "name code startDate endDate status"
      )
      .populate(
        "currentClass",
        "name code description status"
      )
      .populate(
        "currentSection",
        "name code capacity roomNumber status"
      )
      .lean();

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: {
        ...updatedStudent,
        profile: updatedProfile || null,
      },
    });
  } catch (error) {
    console.error("Update student error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: duplicateField
          ? `${duplicateField} already exists`
          : "Student already exists",
        errors: [error.message],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update student",
      errors: [error.message],
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
};
