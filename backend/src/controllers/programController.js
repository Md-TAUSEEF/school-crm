const Program = require("../models/Program");

const createProgram = async (req, res) => {
  try {
    const { name, code, description, duration, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    const existing = await Program.findOne({
      $or: [{ name }, { code: code.toUpperCase() }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Program name or code already exists",
      });
    }

    const program = await Program.create({
      name,
      code: code.toUpperCase(),
      description: description || "",
      duration: duration || "",
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "Program created successfully",
      program,
    });
  } catch (error) {
    console.error("Create program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create program",
    });
  }
};

const getPrograms = async (req, res) => {
  try {
    const programs = await Program.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: programs.length,
      programs,
    });
  } catch (error) {
    console.error("Get programs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
    });
  }
};

const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    return res.status(200).json({
      success: true,
      program,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch program",
    });
  }
};

const updateProgram = async (req, res) => {
  try {
    const { name, code, description, duration, status } = req.body;

    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (name !== undefined) program.name = name;
    if (code !== undefined) program.code = code.toUpperCase();
    if (description !== undefined) program.description = description;
    if (duration !== undefined) program.duration = duration;
    if (status !== undefined) program.status = status;

    await program.save();

    return res.status(200).json({
      success: true,
      message: "Program updated successfully",
      program,
    });
  } catch (error) {
    console.error("Update program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update program",
    });
  }
};

const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    await program.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (error) {
    console.error("Delete program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete program",
    });
  }
};

module.exports = {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
};