
const mongoose = require("mongoose");

const Class = require("../models/Class");
const Program = require("../models/Program");
const AcademicSession = require("../models/AcademicSession");

// =====================================================
// CREATE CLASS
// =====================================================
const createClass = async (req, res) => {
  try {
    const {
      program,
      academicSession,
      name,
      code,
      description,
      status,
    } = req.body;

    // Required fields
    if (!program || !academicSession || !name || !code) {
      return res.status(400).json({
        success: false,
        message:
          "Program, academic session, name and code are required",
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    // Validate Program ObjectId
    if (!mongoose.Types.ObjectId.isValid(program)) {
      return res.status(400).json({
        success: false,
        message: "Invalid program ID",
        code: "INVALID_PROGRAM_ID",
      });
    }

    // Validate Academic Session ObjectId
    if (!mongoose.Types.ObjectId.isValid(academicSession)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic session ID",
        code: "INVALID_ACADEMIC_SESSION_ID",
      });
    }

    // Check Program
    const programExists = await Program.findById(program);

    if (!programExists) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
        code: "PROGRAM_NOT_FOUND",
      });
    }

    // Check Academic Session
    const sessionExists = await AcademicSession.findById(
      academicSession
    );

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        code: "ACADEMIC_SESSION_NOT_FOUND",
      });
    }

    // Normalize values
    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate class name
    const existingClass = await Class.findOne({
      program,
      academicSession,
      name: normalizedName,
    });

    if (existingClass) {
      return res.status(409).json({
        success: false,
        message:
          "This class already exists for this program and session",
        code: "CLASS_ALREADY_EXISTS",
      });
    }

    // Check duplicate class code
    const existingCode = await Class.findOne({
      program,
      academicSession,
      code: normalizedCode,
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message:
          "This class code already exists for this program and session",
        code: "CLASS_CODE_ALREADY_EXISTS",
      });
    }

    // Create class
    const newClass = await Class.create({
      program,
      academicSession,
      name: normalizedName,
      code: normalizedCode,
      description: description || "",
      status: status || "active",
    });

    // Populate response
    const populatedClass = await Class.findById(newClass._id)
      .populate("program", "name code")
      .populate("academicSession", "name code");

    return res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: populatedClass,
    });
  } catch (error) {
    console.error("Create class error:", error);

    // Mongo duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Class with this code already exists",
        code: "CLASS_CODE_ALREADY_EXISTS",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create class",
      code: "CLASS_CREATE_FAILED",
    });
  }
};

// =====================================================
// GET ALL CLASSES
// =====================================================
const getClasses = async (req, res) => {
  try {
    const filter = {};

    if (req.query.program) {
      if (!mongoose.Types.ObjectId.isValid(req.query.program)) {
        return res.status(400).json({
          success: false,
          message: "Invalid program ID",
          code: "INVALID_PROGRAM_ID",
        });
      }

      filter.program = req.query.program;
    }

    if (req.query.academicSession) {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.query.academicSession
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID",
          code: "INVALID_ACADEMIC_SESSION_ID",
        });
      }

      filter.academicSession = req.query.academicSession;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const classes = await Class.find(filter)
      .populate("program", "name code")
      .populate("academicSession", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      classes,
    });
  } catch (error) {
    console.error("Get classes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
      code: "CLASS_FETCH_FAILED",
    });
  }
};

// =====================================================
// GET CLASS BY ID
// =====================================================
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Class ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
        code: "INVALID_CLASS_ID",
      });
    }

    const classData = await Class.findById(id)
      .populate("program", "name code")
      .populate("academicSession", "name code");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      class: classData,
    });
  } catch (error) {
    console.error("Get class by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch class",
      code: "CLASS_FETCH_FAILED",
    });
  }
};

// =====================================================
// UPDATE CLASS
// =====================================================
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      program,
      academicSession,
      name,
      code,
      description,
      status,
    } = req.body;

    // Validate Class ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
        code: "INVALID_CLASS_ID",
      });
    }

    const classData = await Class.findById(id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    // Validate Program if provided
    if (program !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(program)) {
        return res.status(400).json({
          success: false,
          message: "Invalid program ID",
          code: "INVALID_PROGRAM_ID",
        });
      }

      const exists = await Program.findById(program);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
          code: "PROGRAM_NOT_FOUND",
        });
      }

      classData.program = program;
    }

    // Validate Academic Session if provided
    if (academicSession !== undefined) {
      if (
        !mongoose.Types.ObjectId.isValid(academicSession)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID",
          code: "INVALID_ACADEMIC_SESSION_ID",
        });
      }

      const exists = await AcademicSession.findById(
        academicSession
      );

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Academic session not found",
          code: "ACADEMIC_SESSION_NOT_FOUND",
        });
      }

      classData.academicSession = academicSession;
    }

    // Determine final values
    const finalProgram = classData.program;
    const finalAcademicSession = classData.academicSession;
    const finalName =
      name !== undefined ? name.trim() : classData.name;
    const finalCode =
      code !== undefined
        ? code.trim().toUpperCase()
        : classData.code;

    // Check duplicate class name
    const duplicateName = await Class.findOne({
      _id: { $ne: classData._id },
      program: finalProgram,
      academicSession: finalAcademicSession,
      name: finalName,
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message:
          "This class already exists for this program and session",
        code: "CLASS_ALREADY_EXISTS",
      });
    }

    // Check duplicate class code
    const duplicateCode = await Class.findOne({
      _id: { $ne: classData._id },
      program: finalProgram,
      academicSession: finalAcademicSession,
      code: finalCode,
    });

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message:
          "This class code already exists for this program and session",
        code: "CLASS_CODE_ALREADY_EXISTS",
      });
    }

    // Update fields
    if (name !== undefined) {
      classData.name = finalName;
    }

    if (code !== undefined) {
      classData.code = finalCode;
    }

    if (description !== undefined) {
      classData.description = description;
    }

    if (status !== undefined) {
      classData.status = status;
    }

    await classData.save();

    // Populate updated class
    const updatedClass = await Class.findById(classData._id)
      .populate("program", "name code")
      .populate("academicSession", "name code");

    return res.status(200).json({
      success: true,
      message: "Class updated successfully",
      class: updatedClass,
    });
  } catch (error) {
    console.error("Update class error:", error);

    // Mongo duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Class with this code already exists",
        code: "CLASS_CODE_ALREADY_EXISTS",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update class",
      code: "CLASS_UPDATE_FAILED",
    });
  }
};

// =====================================================
// DELETE CLASS
// =====================================================
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Class ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
        code: "INVALID_CLASS_ID",
      });
    }

    const classData = await Class.findById(id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    await classData.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete class error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete class",
      code: "CLASS_DELETE_FAILED",
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
};

