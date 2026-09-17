const FeeStructure = require("../models/FeeStructure");
const AcademicSession = require("../models/AcademicSession");
const Program = require("../models/Program");
const Class = require("../models/Class");

const createFeeStructure = async (req, res) => {
  try {
    const {
      name,
      code,
      academicSession,
      program,
      class: classId,
      feeType,
      amount,
      frequency,
      dueDay,
      description,
      status,
    } = req.body;

    if (
      !name ||
      !code ||
      !academicSession ||
      !program ||
      !feeType ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, code, academicSession, program, feeType and amount are required",
        code: "VALIDATION_ERROR",
      });
    }

    if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid non-negative number",
        code: "INVALID_AMOUNT",
      });
    }

    if (dueDay !== undefined && dueDay !== null) {
      if (
        Number.isNaN(Number(dueDay)) ||
        Number(dueDay) < 1 ||
        Number(dueDay) > 31
      ) {
        return res.status(400).json({
          success: false,
          message: "dueDay must be between 1 and 31",
          code: "INVALID_DUE_DAY",
        });
      }
    }

    const session = await AcademicSession.findById(academicSession);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        code: "ACADEMIC_SESSION_NOT_FOUND",
      });
    }

    const selectedProgram = await Program.findById(program);

    if (!selectedProgram) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
        code: "PROGRAM_NOT_FOUND",
      });
    }

    let selectedClass = null;

    if (classId) {
      selectedClass = await Class.findById(classId);

      if (!selectedClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
          code: "CLASS_NOT_FOUND",
        });
      }

      if (selectedClass.program.toString() !== program.toString()) {
        return res.status(400).json({
          success: false,
          message: "Selected class does not belong to the selected program",
          code: "CLASS_PROGRAM_MISMATCH",
        });
      }

      if (
        selectedClass.academicSession.toString() !== academicSession.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected class does not belong to the selected academic session",
          code: "CLASS_SESSION_MISMATCH",
        });
      }
    }

    const normalizedCode = code.trim().toUpperCase();

    const existingFeeStructure = await FeeStructure.findOne({
      academicSession,
      program,
      class: classId || null,
      code: normalizedCode,
    });

    if (existingFeeStructure) {
      return res.status(409).json({
        success: false,
        message:
          "A fee structure with this code already exists for the selected academic session, program and class",
        code: "FEE_STRUCTURE_EXISTS",
      });
    }

    const feeStructure = await FeeStructure.create({
      name: name.trim(),
      code: normalizedCode,
      academicSession,
      program,
      class: classId || null,
      feeType,
      amount: Number(amount),
      frequency: frequency || "one_time",
      dueDay: dueDay === undefined || dueDay === null ? null : Number(dueDay),
      description: description || "",
      status: status || "active",
    });

    const populatedFeeStructure = await FeeStructure.findById(feeStructure._id)
      .populate("academicSession", "name code startDate endDate status")
      .populate("program", "name code duration status")
      .populate("class", "name code status");

    return res.status(201).json({
      success: true,
      message: "Fee structure created successfully",
      data: populatedFeeStructure,
    });
  } catch (error) {
    console.error("Create fee structure error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Fee structure already exists",
        code: "DUPLICATE_FEE_STRUCTURE",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create fee structure",
      code: "SERVER_ERROR",
    });
  }
};

const getFeeStructures = async (req, res) => {
  try {
    const {
      academicSession,
      program,
      class: classId,
      feeType,
      status,
      frequency,
    } = req.query;

    const filter = {};

    if (academicSession) {
      filter.academicSession = academicSession;
    }

    if (program) {
      filter.program = program;
    }

    if (classId) {
      filter.class = classId;
    }

    if (feeType) {
      filter.feeType = feeType;
    }

    if (status) {
      filter.status = status;
    }

    if (frequency) {
      filter.frequency = frequency;
    }

    const feeStructures = await FeeStructure.find(filter)
      .populate("academicSession", "name code startDate endDate status")
      .populate("program", "name code duration status")
      .populate("class", "name code status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Fee structures fetched successfully",
      count: feeStructures.length,
      data: feeStructures,
    });
  } catch (error) {
    console.error("Get fee structures error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee structures",
      code: "SERVER_ERROR",
    });
  }
};

const getFeeStructureById = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findById(id)
      .populate("academicSession", "name code startDate endDate status")
      .populate("program", "name code duration status")
      .populate("class", "name code status");

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
        code: "FEE_STRUCTURE_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee structure fetched successfully",
      data: feeStructure,
    });
  } catch (error) {
    console.error("Get fee structure error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee structure",
      code: "SERVER_ERROR",
    });
  }
};

const updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findById(id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
        code: "FEE_STRUCTURE_NOT_FOUND",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "academicSession",
      "program",
      "class",
      "feeType",
      "amount",
      "frequency",
      "dueDay",
      "description",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.amount !== undefined) {
      if (Number.isNaN(Number(updates.amount)) || Number(updates.amount) < 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid non-negative number",
          code: "INVALID_AMOUNT",
        });
      }

      updates.amount = Number(updates.amount);
    }

    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase();
    }

    if (updates.dueDay !== undefined) {
      if (
        updates.dueDay !== null &&
        (Number.isNaN(Number(updates.dueDay)) ||
          Number(updates.dueDay) < 1 ||
          Number(updates.dueDay) > 31)
      ) {
        return res.status(400).json({
          success: false,
          message: "dueDay must be between 1 and 31",
          code: "INVALID_DUE_DAY",
        });
      }

      updates.dueDay = updates.dueDay === null ? null : Number(updates.dueDay);
    }

    const finalAcademicSession =
      updates.academicSession || feeStructure.academicSession;

    const finalProgram = updates.program || feeStructure.program;

    const finalClass =
      updates.class !== undefined ? updates.class : feeStructure.class;

    const session = await AcademicSession.findById(finalAcademicSession);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
        code: "ACADEMIC_SESSION_NOT_FOUND",
      });
    }

    const selectedProgram = await Program.findById(finalProgram);

    if (!selectedProgram) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
        code: "PROGRAM_NOT_FOUND",
      });
    }

    if (finalClass) {
      const selectedClass = await Class.findById(finalClass);

      if (!selectedClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
          code: "CLASS_NOT_FOUND",
        });
      }

      if (selectedClass.program.toString() !== finalProgram.toString()) {
        return res.status(400).json({
          success: false,
          message: "Selected class does not belong to the selected program",
          code: "CLASS_PROGRAM_MISMATCH",
        });
      }

      if (
        selectedClass.academicSession.toString() !==
        finalAcademicSession.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected class does not belong to the selected academic session",
          code: "CLASS_SESSION_MISMATCH",
        });
      }
    }

    const duplicateFilter = {
      _id: { $ne: id },
      academicSession: finalAcademicSession,
      program: finalProgram,
      class: finalClass || null,
      code: updates.code || feeStructure.code,
    };

    const duplicate = await FeeStructure.findOne(duplicateFilter);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another fee structure with the same code already exists",
        code: "DUPLICATE_FEE_STRUCTURE",
      });
    }

    Object.assign(feeStructure, updates);

    await feeStructure.save();

    const populatedFeeStructure = await FeeStructure.findById(feeStructure._id)
      .populate("academicSession", "name code startDate endDate status")
      .populate("program", "name code duration status")
      .populate("class", "name code status");

    return res.status(200).json({
      success: true,
      message: "Fee structure updated successfully",
      data: populatedFeeStructure,
    });
  } catch (error) {
    console.error("Update fee structure error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another fee structure with the same code already exists",
        code: "DUPLICATE_FEE_STRUCTURE",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update fee structure",
      code: "SERVER_ERROR",
    });
  }
};

const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findById(id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
        code: "FEE_STRUCTURE_NOT_FOUND",
      });
    }

    await FeeStructure.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    console.error("Delete fee structure error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete fee structure",
      code: "SERVER_ERROR",
    });
  }
};

module.exports = {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
};
