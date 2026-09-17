const mongoose = require("mongoose");

const Subject = require("../models/Subject");
const Program = require("../models/Program");
const Class = require("../models/Class");
const Section = require("../models/Section");
const AcademicSession = require("../models/AcademicSession");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * CREATE SUBJECT
 */
const createSubject = async (req, res) => {
  try {
    const {
      program,
      academicSession,
      class: classId,
      section,
      name,
      code,
      description,
      maxMarks,
      status,
    } = req.body;

    if (
      !program ||
      !academicSession ||
      !classId ||
      !section ||
      !name ||
      !code
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Program, academic session, class, section, name and code are required",
      });
    }

    if (
      !isValidObjectId(program) ||
      !isValidObjectId(academicSession) ||
      !isValidObjectId(classId) ||
      !isValidObjectId(section)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid program, academic session, class or section ID",
      });
    }

    /**
     * Find all parent records
     */
    const [
      programExists,
      sessionExists,
      classExists,
      sectionExists,
    ] = await Promise.all([
      Program.findById(program),
      AcademicSession.findById(academicSession),
      Class.findById(classId),
      Section.findById(section),
    ]);

    if (!programExists) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (!sectionExists) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    /**
     * Class must belong to selected Program
     */
    if (
      String(classExists.program) !==
      String(program)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected class does not belong to the selected program",
      });
    }

    /**
     * Class must belong to selected Academic Session
     */
    if (
      String(classExists.academicSession) !==
      String(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected class does not belong to the selected academic session",
      });
    }

    /**
     * Section must belong to selected Class
     */
    if (
      String(sectionExists.class) !==
      String(classId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected section does not belong to the selected class",
      });
    }

    /**
     * Section must belong to selected Academic Session
     */
    if (
      String(sectionExists.academicSession) !==
      String(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected section does not belong to the selected academic session",
      });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();

    /**
     * Duplicate check
     */
    const existing = await Subject.findOne({
      section,
      academicSession,
      $or: [
        { name: normalizedName },
        { code: normalizedCode },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Subject name or code already exists for this section",
      });
    }

    /**
     * Validate max marks
     */
    let normalizedMaxMarks = 100;

    if (
      maxMarks !== undefined &&
      maxMarks !== null &&
      maxMarks !== ""
    ) {
      normalizedMaxMarks = Number(maxMarks);

      if (
        !Number.isFinite(normalizedMaxMarks) ||
        normalizedMaxMarks < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Max marks must be a valid number",
        });
      }
    }

    const subject = await Subject.create({
      program,
      academicSession,
      class: classId,
      section,
      name: normalizedName,
      code: normalizedCode,
      description: description?.trim() || "",
      maxMarks: normalizedMaxMarks,
      status: status || "active",
    });

    const populatedSubject = await Subject.findById(subject._id)
      .populate("program", "name code")
      .populate("academicSession", "name code")
      .populate("class", "name code")
      .populate("section", "name code");

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject: populatedSubject,
    });
  } catch (error) {
    console.error("Create subject error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Subject name or code already exists for this section",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create subject",
    });
  }
};

/**
 * GET SUBJECTS
 *
 * Supported filters:
 *
 * ?program=
 * ?academicSession=
 * ?class=
 * ?section=
 * ?status=
 */
const getSubjects = async (req, res) => {
  try {
    const {
      program,
      academicSession,
      class: classId,
      section,
      status,
    } = req.query;

    const filter = {};

    if (program) {
      if (!isValidObjectId(program)) {
        return res.status(400).json({
          success: false,
          message: "Invalid program ID",
        });
      }

      filter.program = program;
    }

    if (academicSession) {
      if (!isValidObjectId(academicSession)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID",
        });
      }

      filter.academicSession = academicSession;
    }

    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      filter.class = classId;
    }

    if (section) {
      if (!isValidObjectId(section)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section ID",
        });
      }

      filter.section = section;
    }

    if (status) {
      filter.status = status;
    }

    const subjects = await Subject.find(filter)
      .populate("program", "name code")
      .populate("academicSession", "name code")
      .populate("class", "name code")
      .populate("section", "name code")
      .sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error("Get subjects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
};

/**
 * GET SUBJECT BY ID
 */
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(id)
      .populate("program", "name code")
      .populate("academicSession", "name code")
      .populate("class", "name code")
      .populate("section", "name code");

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      subject,
    });
  } catch (error) {
    console.error("Get subject error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subject",
    });
  }
};

/**
 * UPDATE SUBJECT
 */
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const {
      program,
      academicSession,
      class: classId,
      section,
      name,
      code,
      description,
      maxMarks,
      status,
    } = req.body;

    const nextProgram =
      program !== undefined ? program : subject.program;

    const nextAcademicSession =
      academicSession !== undefined
        ? academicSession
        : subject.academicSession;

    const nextClass =
      classId !== undefined ? classId : subject.class;

    const nextSection =
      section !== undefined ? section : subject.section;

    /**
     * Validate IDs
     */
    if (
      !isValidObjectId(nextProgram) ||
      !isValidObjectId(nextAcademicSession) ||
      !isValidObjectId(nextClass) ||
      !isValidObjectId(nextSection)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid program, academic session, class or section ID",
      });
    }

    /**
     * Find related records
     */
    const [
      programExists,
      sessionExists,
      classExists,
      sectionExists,
    ] = await Promise.all([
      Program.findById(nextProgram),
      AcademicSession.findById(nextAcademicSession),
      Class.findById(nextClass),
      Section.findById(nextSection),
    ]);

    if (!programExists) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (!sectionExists) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    /**
     * Validate complete hierarchy
     */
    if (
      String(classExists.program) !==
      String(nextProgram)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected class does not belong to the selected program",
      });
    }

    if (
      String(classExists.academicSession) !==
      String(nextAcademicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected class does not belong to the selected academic session",
      });
    }

    if (
      String(sectionExists.class) !==
      String(nextClass)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected section does not belong to the selected class",
      });
    }

    if (
      String(sectionExists.academicSession) !==
      String(nextAcademicSession)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected section does not belong to the selected academic session",
      });
    }

    if (name !== undefined) {
      const normalizedName = name.trim();

      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Subject name cannot be empty",
        });
      }

      subject.name = normalizedName;
    }

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Subject code cannot be empty",
        });
      }

      subject.code = normalizedCode;
    }

    if (description !== undefined) {
      subject.description = description.trim();
    }

    if (maxMarks !== undefined) {
      const normalizedMaxMarks = Number(maxMarks);

      if (
        !Number.isFinite(normalizedMaxMarks) ||
        normalizedMaxMarks < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Max marks must be a valid number",
        });
      }

      subject.maxMarks = normalizedMaxMarks;
    }

    if (status !== undefined) {
      subject.status = status;
    }

    subject.program = nextProgram;
    subject.academicSession = nextAcademicSession;
    subject.class = nextClass;
    subject.section = nextSection;

    await subject.save();

    const updatedSubject = await Subject.findById(subject._id)
      .populate("program", "name code")
      .populate("academicSession", "name code")
      .populate("class", "name code")
      .populate("section", "name code");

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject: updatedSubject,
    });
  } catch (error) {
    console.error("Update subject error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Subject name or code already exists for this section",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update subject",
    });
  }
};

/**
 * DELETE SUBJECT
 */
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    await subject.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Delete subject error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete subject",
    });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};