const bcrypt = require("bcryptjs");

const User = require("../models/User");
const ParentProfile = require("../models/ParentProfile");
const generateUniqueId = require("../utils/generateUniqueId");
const { createAuditLog } = require("../services/auditLogService");

const createParent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      occupation,
      address,
      city,
      state,
      postalCode,
      emergencyContact,
      status,
    } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userId = await generateUniqueId("parent");

    const parent = await User.create({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      email: normalizedEmail,
      phone: phone?.trim() || "",
      password: hashedPassword,
      role: "parent",
      userId,
      status: status || "active",
    });

    try {
      const profile = await ParentProfile.create({
        user: parent._id,
        occupation: occupation?.trim() || "",
        address: address?.trim() || "",
        city: city?.trim() || "",
        state: state?.trim() || "",
        postalCode: postalCode?.trim() || "",
        emergencyContact: emergencyContact?.trim() || "",
        status: status || "active",
      });

      // Audit successful parent creation
      await createAuditLog({
        userId: req.user?._id || req.user?.id || null,
        action: "PARENT_CREATE",
        entity: "Parent",
        entityId: parent._id,
        metadata: {
          parentId: parent.userId,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          phone: parent.phone,
          status: parent.status,
          profileId: profile._id,
        },
        req,
      });

      return res.status(201).json({
        success: true,
        message: "Parent created successfully",
        parent: {
          id: parent._id,
          userId: parent.userId,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          phone: parent.phone,
          role: parent.role,
          status: parent.status,
          profile: {
            id: profile._id,
            occupation: profile.occupation,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            postalCode: profile.postalCode,
            emergencyContact: profile.emergencyContact,
            status: profile.status,
          },
        },
      });
    } catch (profileError) {
      // Roll back parent user if profile creation fails
      await User.findByIdAndDelete(parent._id);

      throw profileError;
    }
  } catch (error) {
    console.error("Create parent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create parent",
      error: error.message,
    });
  }
};

const getParents = async (req, res) => {
  try {
    const parents = await User.find({
      role: "parent",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parents.length,
      parents,
    });
  } catch (error) {
    console.error("Get parents error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parents",
      error: error.message,
    });
  }
};

const getParentById = async (req, res) => {
  try {
    const parent = await User.findOne({
      _id: req.params.id,
      role: "parent",
    }).select("-password");

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    const profile = await ParentProfile.findOne({
      user: parent._id,
    });

    return res.status(200).json({
      success: true,
      parent: {
        ...parent.toObject(),
        profile,
      },
    });
  } catch (error) {
    console.error("Get parent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parent",
      error: error.message,
    });
  }
};


const updateParent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      occupation,
      address,
      city,
      state,
      postalCode,
      emergencyContact,
      status,
    } = req.body;

    const parent = await User.findOne({
      _id: id,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Email
    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: parent._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }

      parent.email = normalizedEmail;
    }

    // Basic information
    if (firstName !== undefined) {
      if (!firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name cannot be empty",
        });
      }

      parent.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      parent.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      parent.phone = phone.trim();
    }

    if (status !== undefined) {
      const allowedStatuses = ["active", "inactive", "suspended"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent status",
        });
      }

      parent.status = status;
    }

    // Optional password update
    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      parent.password = await bcrypt.hash(password, 12);
    }

    await parent.save();

    // Update ParentProfile
    const profileData = {};

    if (occupation !== undefined) {
      profileData.occupation = occupation.trim();
    }

    if (address !== undefined) {
      profileData.address = address.trim();
    }

    if (city !== undefined) {
      profileData.city = city.trim();
    }

    if (state !== undefined) {
      profileData.state = state.trim();
    }

    if (postalCode !== undefined) {
      profileData.postalCode = postalCode.trim();
    }

    if (emergencyContact !== undefined) {
      profileData.emergencyContact = emergencyContact.trim();
    }

    if (status !== undefined) {
      profileData.status = status === "suspended" ? "inactive" : status;
    }

    const profile = await ParentProfile.findOneAndUpdate(
      { user: parent._id },
      { $set: profileData },
      {
        new: true,
        runValidators: true,
      }
    );

    await createAuditLog({
      userId: req.user?._id || req.user?.id || null,
      action: "PARENT_UPDATE",
      entity: "Parent",
      entityId: parent._id,
      metadata: {
        parentId: parent.userId,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone,
        status: parent.status,
        profileId: profile?._id || null,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Parent updated successfully",
      parent: {
        id: parent._id,
        userId: parent.userId,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone,
        role: parent.role,
        status: parent.status,
        profile: profile
          ? {
              id: profile._id,
              occupation: profile.occupation,
              address: profile.address,
              city: profile.city,
              state: profile.state,
              postalCode: profile.postalCode,
              emergencyContact: profile.emergencyContact,
              status: profile.status,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Update parent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update parent",
      error: error.message,
    });
  }
};



module.exports = {
  createParent,
  getParents,
  getParentById,
  updateParent,
};