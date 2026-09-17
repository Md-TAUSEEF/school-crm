const AcademicSession = require("../models/AcademicSession");

const createAcademicSession = async (req, res) => {
  try {
    const { name, code, startDate, endDate, status, description } = req.body;

    if (!name || !code || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, code, start date and end date are required",
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const existing = await AcademicSession.findOne({
      $or: [{ name }, { code: code.toUpperCase() }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Academic session name or code already exists",
      });
    }

    const session = await AcademicSession.create({
      name,
      code: code.toUpperCase(),
      startDate,
      endDate,
      status: status || "upcoming",
      description: description || "",
    });

    return res.status(201).json({
      success: true,
      message: "Academic session created successfully",
      session,
    });
  } catch (error) {
    console.error("Create academic session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create academic session",
    });
  }
};

const getAcademicSessions = async (req, res) => {
  try {
    const sessions = await AcademicSession.find().sort({
      startDate: -1,
    });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get academic sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic sessions",
    });
  }
};

const getAcademicSessionById = async (req, res) => {
  try {
    const session = await AcademicSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic session",
    });
  }
};

const updateAcademicSession = async (req, res) => {
  try {
    const { name, code, startDate, endDate, status, description } = req.body;

    const session = await AcademicSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    if (startDate && endDate) {
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    if (name !== undefined) session.name = name;
    if (code !== undefined) session.code = code.toUpperCase();
    if (startDate !== undefined) session.startDate = startDate;
    if (endDate !== undefined) session.endDate = endDate;
    if (status !== undefined) session.status = status;
    if (description !== undefined) session.description = description;

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Academic session updated successfully",
      session,
    });
  } catch (error) {
    console.error("Update academic session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update academic session",
    });
  }
};

const deleteAcademicSession = async (req, res) => {
  try {
    const session = await AcademicSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    await session.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Academic session deleted successfully",
    });
  } catch (error) {
    console.error("Delete academic session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete academic session",
    });
  }
};

module.exports = {
  createAcademicSession,
  getAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
  deleteAcademicSession,
};