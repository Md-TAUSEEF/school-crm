const Enrollment = require("../models/Enrollment");

const getEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate(
        "student",
        "firstName lastName email phone userId status"
      )
      .populate(
        "academicSession",
        "name code startDate endDate status"
      )
      .populate(
        "program",
        "name code duration status"
      )
      .populate(
        "class",
        "name code status"
      )
      .populate(
        "section",
        "name code capacity roomNumber status"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error("Get enrollments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments",
      error: error.message,
    });
  }
};

const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(
      req.params.id
    )
      .populate(
        "student",
        "firstName lastName email phone userId status"
      )
      .populate(
        "academicSession",
        "name code startDate endDate status"
      )
      .populate(
        "program",
        "name code duration status"
      )
      .populate(
        "class",
        "name code status"
      )
      .populate(
        "section",
        "name code capacity roomNumber status"
      );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    return res.status(200).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    console.error(
      "Get enrollment by id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment",
      error: error.message,
    });
  }
};

module.exports = {
  getEnrollments,
  getEnrollmentById,
};