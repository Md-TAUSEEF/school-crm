const StudentGuardian = require("../models/StudentGuardian");
const User = require("../models/User");

const createGuardianRelationship = async (req, res) => {
  try {
    const {
      student,
      parent,
      relationship,
      isPrimary,
      canReceiveNotifications,
      status,
    } = req.body;

    if (!student || !parent || !relationship) {
      return res.status(400).json({
        success: false,
        message: "Student, parent and relationship are required",
      });
    }

    // Verify student
    const studentUser = await User.findOne({
      _id: student,
      role: "student",
    });

    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Verify parent
    const parentUser = await User.findOne({
      _id: parent,
      role: "parent",
    });

    if (!parentUser) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Check duplicate relationship
    const existingRelationship = await StudentGuardian.findOne({
      student,
      parent,
    });

    if (existingRelationship) {
      return res.status(409).json({
        success: false,
        message: "This student-parent relationship already exists",
      });
    }

    // If this relationship is primary,
    // remove primary status from other parents of this student.
    if (isPrimary === true) {
      await StudentGuardian.updateMany(
        {
          student,
          status: "active",
        },
        {
          $set: {
            isPrimary: false,
          },
        }
      );
    }

    const guardian = await StudentGuardian.create({
      student,
      parent,
      relationship,
      isPrimary: isPrimary === true,
      canReceiveNotifications:
        canReceiveNotifications !== false,
      status: status || "active",
    });

    // Keep User arrays synchronized as convenience/cache fields.
    await User.findByIdAndUpdate(student, {
      $addToSet: {
        parents: parent,
      },
    });

    await User.findByIdAndUpdate(parent, {
      $addToSet: {
        children: student,
      },
    });

    const populatedGuardian = await StudentGuardian.findById(
      guardian._id
    )
      .populate("student", "firstName lastName email userId role")
      .populate("parent", "firstName lastName email phone userId role");

    return res.status(201).json({
      success: true,
      message: "Student-parent relationship created successfully",
      guardian: populatedGuardian,
    });
  } catch (error) {
    console.error(
      "Create guardian relationship error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create student-parent relationship",
      error: error.message,
    });
  }
};

const getStudentGuardians = async (req, res) => {
  try {
    const guardians = await StudentGuardian.find({
      student: req.params.studentId,
      status: "active",
    })
      .populate(
        "student",
        "firstName lastName email userId role"
      )
      .populate(
        "parent",
        "firstName lastName email phone userId role"
      )
      .sort({
        isPrimary: -1,
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      count: guardians.length,
      guardians,
    });
  } catch (error) {
    console.error("Get student guardians error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student guardians",
      error: error.message,
    });
  }
};

const getParentChildren = async (req, res) => {
  try {
    const guardians = await StudentGuardian.find({
      parent: req.params.parentId,
      status: "active",
    })
      .populate(
        "student",
        "firstName lastName email phone userId role status"
      )
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      count: guardians.length,
      children: guardians.map((item) => ({
        relationshipId: item._id,
        relationship: item.relationship,
        isPrimary: item.isPrimary,
        canReceiveNotifications:
          item.canReceiveNotifications,
        student: item.student,
      })),
    });
  } catch (error) {
    console.error("Get parent children error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parent's children",
      error: error.message,
    });
  }
};

const updateGuardianRelationship = async (req, res) => {
  try {
    const guardian = await StudentGuardian.findById(
      req.params.id
    );

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian relationship not found",
      });
    }

    const {
      relationship,
      isPrimary,
      canReceiveNotifications,
      status,
    } = req.body;

    if (isPrimary === true) {
      await StudentGuardian.updateMany(
        {
          student: guardian.student,
          _id: { $ne: guardian._id },
          status: "active",
        },
        {
          $set: {
            isPrimary: false,
          },
        }
      );
    }

    if (relationship !== undefined) {
      guardian.relationship = relationship;
    }

    if (isPrimary !== undefined) {
      guardian.isPrimary = isPrimary;
    }

    if (canReceiveNotifications !== undefined) {
      guardian.canReceiveNotifications =
        canReceiveNotifications;
    }

    if (status !== undefined) {
      guardian.status = status;
    }

    await guardian.save();

    return res.status(200).json({
      success: true,
      message: "Guardian relationship updated successfully",
      guardian,
    });
  } catch (error) {
    console.error(
      "Update guardian relationship error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update guardian relationship",
      error: error.message,
    });
  }
};

const deleteGuardianRelationship = async (req, res) => {
  try {
    const guardian = await StudentGuardian.findById(
      req.params.id
    );

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian relationship not found",
      });
    }

    const studentId = guardian.student;
    const parentId = guardian.parent;

    await StudentGuardian.findByIdAndDelete(
      guardian._id
    );

    // Remove cached relationship from User arrays.
    await User.findByIdAndUpdate(studentId, {
      $pull: {
        parents: parentId,
      },
    });

    await User.findByIdAndUpdate(parentId, {
      $pull: {
        children: studentId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Guardian relationship deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete guardian relationship error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete guardian relationship",
      error: error.message,
    });
  }
};

module.exports = {
  createGuardianRelationship,
  getStudentGuardians,
  getParentChildren,
  updateGuardianRelationship,
  deleteGuardianRelationship,
};