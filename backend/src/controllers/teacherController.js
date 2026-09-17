const bcrypt = require("bcryptjs");

const User = require("../models/User");
const TeacherProfile = require("../models/TeacherProfile");
const generateUniqueId = require("../utils/generateUniqueId");
const { createAuditLog } = require("../services/auditLogService");

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const EMPLOYEE_TYPES = [
  "full_time",
  "part_time",
  "contract",
];

const TEACHER_STATUSES = [
  "active",
  "inactive",
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getCurrentUserId = (req) =>
  req.user?._id || req.user?.id || null;

/*
|--------------------------------------------------------------------------
| CREATE TEACHER
| Admin only
|--------------------------------------------------------------------------
*/

const createTeacher = async (req, res) => {
  try {
    const {
      firstName,
      lastName = "",
      email,
      phone = "",
      password,
      qualification = "",
      specialization = "",
      joiningDate = null,
      employeeType = "",
      status = "active",
    } = req.body;

    if (!firstName || !String(firstName).trim()) {
      return res.status(422).json({
        success: false,
        message: "First name is required",
        code: "FIRST_NAME_REQUIRED",
        errors: [],
      });
    }

    if (!email || !String(email).trim()) {
      return res.status(422).json({
        success: false,
        message: "Email is required",
        code: "EMAIL_REQUIRED",
        errors: [],
      });
    }

    if (!password || String(password).length < 6) {
      return res.status(422).json({
        success: false,
        message:
          "Password must be at least 6 characters",
        code: "INVALID_PASSWORD",
        errors: [],
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
        code: "EMAIL_ALREADY_EXISTS",
        errors: [],
      });
    }

    if (
      employeeType &&
      !EMPLOYEE_TYPES.includes(employeeType)
    ) {
      return res.status(422).json({
        success: false,
        message: "Invalid employee type",
        code: "INVALID_EMPLOYEE_TYPE",
        errors: [],
      });
    }

    if (!TEACHER_STATUSES.includes(status)) {
      return res.status(422).json({
        success: false,
        message: "Invalid teacher status",
        code: "INVALID_STATUS",
        errors: [],
      });
    }

    if (joiningDate) {
      const parsedJoiningDate = new Date(
        joiningDate
      );

      if (
        Number.isNaN(
          parsedJoiningDate.getTime()
        )
      ) {
        return res.status(422).json({
          success: false,
          message: "Invalid joining date",
          code: "INVALID_JOINING_DATE",
          errors: [],
        });
      }
    }

    const hashedPassword = await bcrypt.hash(
      String(password),
      12
    );

    const teacherUserId =
      await generateUniqueId("teacher");

    const teacher = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      password: hashedPassword,
      role: "teacher",
      userId: teacherUserId,
      status,
    });

    try {
      const teacherProfile =
        await TeacherProfile.create({
          user: teacher._id,
          qualification:
            String(qualification).trim(),
          specialization:
            String(specialization).trim(),
          joiningDate: joiningDate || null,
          employeeType,
          status,
        });

      await createAuditLog({
        userId: getCurrentUserId(req),
        action: "TEACHER_CREATE",
        entity: "Teacher",
        entityId: teacher._id,
        metadata: {
          teacherId: teacher.userId,
          profileId: teacherProfile._id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          phone: teacher.phone,
          qualification:
            teacherProfile.qualification,
          specialization:
            teacherProfile.specialization,
          employeeType:
            teacherProfile.employeeType,
          status: teacher.status,
        },
        req,
      });

      return res.status(201).json({
        success: true,
        message: "Teacher created successfully",
        data: {
          teacher: {
            id: teacher._id,
            userId: teacher.userId,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email,
            phone: teacher.phone,
            role: teacher.role,
            status: teacher.status,
            profile: teacherProfile,
          },
        },
      });
    } catch (profileError) {
      // Roll back User if TeacherProfile creation fails.
      await User.findByIdAndDelete(
        teacher._id
      );

      throw profileError;
    }
  } catch (error) {
    console.error(
      "Create teacher error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Teacher already exists",
        code: "TEACHER_ALREADY_EXISTS",
        errors: [],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create teacher",
      code: "TEACHER_CREATE_FAILED",
      errors: [],
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL TEACHERS
| Admin / Teacher
|--------------------------------------------------------------------------
|
| IMPORTANT:
| employeeType and specialization are now filtered BEFORE pagination.
| Therefore total and totalPages remain accurate.
|
|--------------------------------------------------------------------------
*/

const getTeachers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      employeeType,
      specialization,
    } = req.query;

    const parsedPage = Math.max(
      Number(page) || 1,
      1
    );

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    /*
    |--------------------------------------------------------------------------
    | Validate status filter
    |--------------------------------------------------------------------------
    */

    if (
      status &&
      !TEACHER_STATUSES.includes(status)
    ) {
      return res.status(422).json({
        success: false,
        message: "Invalid status filter",
        code: "INVALID_STATUS",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate employee type filter
    |--------------------------------------------------------------------------
    */

    if (
      employeeType &&
      !EMPLOYEE_TYPES.includes(employeeType)
    ) {
      return res.status(422).json({
        success: false,
        message: "Invalid employee type filter",
        code: "INVALID_EMPLOYEE_TYPE",
        errors: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | User filter
    |--------------------------------------------------------------------------
    */

    const userFilter = {
      role: "teacher",
    };

    if (status) {
      userFilter.status = status;
    }

    if (
      search &&
      String(search).trim()
    ) {
      const searchValue =
        String(search).trim();

      userFilter.$or = [
        {
          firstName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          email: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          userId: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Profile-level filters
    |--------------------------------------------------------------------------
    |
    | We first find matching TeacherProfile records.
    | Their user IDs are then applied to the User query.
    |
    | This makes pagination and total counts accurate.
    |
    */

    const hasProfileFilters =
      Boolean(employeeType) ||
      Boolean(
        specialization &&
          String(specialization).trim()
      );

    if (hasProfileFilters) {
      const profileFilter = {};

      if (employeeType) {
        profileFilter.employeeType =
          employeeType;
      }

      if (
        specialization &&
        String(specialization).trim()
      ) {
        profileFilter.specialization = {
          $regex:
            String(specialization).trim(),
          $options: "i",
        };
      }

      const matchingProfiles =
        await TeacherProfile.find(
          profileFilter
        )
          .select("user")
          .lean();

      const matchingTeacherIds =
        matchingProfiles.map(
          (profile) => profile.user
        );

      /*
      |--------------------------------------------------------------------------
      | No matching profiles
      |--------------------------------------------------------------------------
      |
      | Return an honest empty result instead of
      | running an unnecessary User query.
      |
      */

      if (
        matchingTeacherIds.length === 0
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Teachers fetched successfully",
          data: {
            items: [],
            pagination: {
              page: parsedPage,
              limit: parsedLimit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      userFilter._id = {
        $in: matchingTeacherIds,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const skip =
      (parsedPage - 1) *
      parsedLimit;

    /*
    |--------------------------------------------------------------------------
    | Fetch teachers + total
    |--------------------------------------------------------------------------
    */

    const [teachers, total] =
      await Promise.all([
        User.find(userFilter)
          .select(
            "firstName lastName email phone role userId status profileImage createdAt updatedAt"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),

        User.countDocuments(
          userFilter
        ),
      ]);

    /*
    |--------------------------------------------------------------------------
    | Fetch profiles for current page
    |--------------------------------------------------------------------------
    */

    const teacherIds =
      teachers.map(
        (teacher) => teacher._id
      );

    const profiles =
      teacherIds.length > 0
        ? await TeacherProfile.find({
            user: {
              $in: teacherIds,
            },
          }).lean()
        : [];

    const profileMap = new Map(
      profiles.map((profile) => [
        String(profile.user),
        profile,
      ])
    );

    /*
    |--------------------------------------------------------------------------
    | Merge User + TeacherProfile
    |--------------------------------------------------------------------------
    */

    const items = teachers.map(
      (teacher) => ({
        ...teacher,
        profile:
          profileMap.get(
            String(teacher._id)
          ) || null,
      })
    );

    return res.status(200).json({
      success: true,
      message:
        "Teachers fetched successfully",
      data: {
        items,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(
            total / parsedLimit
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Get teachers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch teachers",
      code: "TEACHER_FETCH_FAILED",
      errors: [],
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET TEACHER BY ID
| Admin / Teacher
|--------------------------------------------------------------------------
*/

const getTeacherById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const teacher =
      await User.findOne({
        _id: id,
        role: "teacher",
      })
        .select(
          "firstName lastName email phone role userId status profileImage createdAt updatedAt"
        )
        .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
        code: "TEACHER_NOT_FOUND",
        errors: [],
      });
    }

    const profile =
      await TeacherProfile.findOne({
        user: teacher._id,
      }).lean();

    return res.status(200).json({
      success: true,
      message:
        "Teacher fetched successfully",
      data: {
        ...teacher,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error(
      "Get teacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch teacher",
      code: "TEACHER_FETCH_FAILED",
      errors: [],
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE TEACHER
| Admin only
|--------------------------------------------------------------------------
*/

const updateTeacher = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      qualification,
      specialization,
      joiningDate,
      employeeType,
      status,
    } = req.body;

    const teacher =
      await User.findOne({
        _id: id,
        role: "teacher",
      }).select("+password");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
        code: "TEACHER_NOT_FOUND",
        errors: [],
      });
    }

    const profile =
      await TeacherProfile.findOne({
        user: teacher._id,
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher profile not found",
        code: "TEACHER_PROFILE_NOT_FOUND",
        errors: [],
      });
    }

    const previous = {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      qualification:
        profile.qualification,
      specialization:
        profile.specialization,
      joiningDate:
        profile.joiningDate,
      employeeType:
        profile.employeeType,
    };

    /*
    |--------------------------------------------------------------------------
    | Basic User Fields
    |--------------------------------------------------------------------------
    */

    if (firstName !== undefined) {
      if (!String(firstName).trim()) {
        return res.status(422).json({
          success: false,
          message:
            "First name cannot be empty",
          code: "INVALID_FIRST_NAME",
          errors: [],
        });
      }

      teacher.firstName =
        String(firstName).trim();
    }

    if (lastName !== undefined) {
      teacher.lastName =
        String(lastName).trim();
    }

    if (email !== undefined) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return res.status(422).json({
          success: false,
          message:
            "Email cannot be empty",
          code: "INVALID_EMAIL",
          errors: [],
        });
      }

      const emailExists =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: teacher._id,
          },
        });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message:
            "Email is already in use",
          code: "EMAIL_ALREADY_EXISTS",
          errors: [],
        });
      }

      teacher.email =
        normalizedEmail;
    }

    if (phone !== undefined) {
      teacher.phone =
        String(phone).trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Password
    |--------------------------------------------------------------------------
    */

    if (password !== undefined) {
      if (
        String(password).length < 6
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Password must be at least 6 characters",
          code: "INVALID_PASSWORD",
          errors: [],
        });
      }

      teacher.password =
        await bcrypt.hash(
          String(password),
          12
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (status !== undefined) {
      if (
        !TEACHER_STATUSES.includes(
          status
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Invalid teacher status",
          code: "INVALID_STATUS",
          errors: [],
        });
      }

      teacher.status = status;
      profile.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Profile Fields
    |--------------------------------------------------------------------------
    */

    if (qualification !== undefined) {
      profile.qualification =
        String(
          qualification
        ).trim();
    }

    if (specialization !== undefined) {
      profile.specialization =
        String(
          specialization
        ).trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Joining Date
    |--------------------------------------------------------------------------
    */

    if (joiningDate !== undefined) {
      if (
        joiningDate === null ||
        joiningDate === ""
      ) {
        profile.joiningDate =
          null;
      } else {
        const parsedJoiningDate =
          new Date(joiningDate);

        if (
          Number.isNaN(
            parsedJoiningDate.getTime()
          )
        ) {
          return res.status(422).json({
            success: false,
            message:
              "Invalid joining date",
            code:
              "INVALID_JOINING_DATE",
            errors: [],
          });
        }

        profile.joiningDate =
          parsedJoiningDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Employee Type
    |--------------------------------------------------------------------------
    */

    if (employeeType !== undefined) {
      if (
        employeeType &&
        !EMPLOYEE_TYPES.includes(
          employeeType
        )
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Invalid employee type",
          code:
            "INVALID_EMPLOYEE_TYPE",
          errors: [],
        });
      }

      profile.employeeType =
        employeeType;
    }

    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    */

    await teacher.save();
    await profile.save();

    /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      userId: getCurrentUserId(req),
      action: "TEACHER_UPDATE",
      entity: "Teacher",
      entityId: teacher._id,
      metadata: {
        teacherId: teacher.userId,

        previous,

        updated: {
          firstName:
            teacher.firstName,
          lastName:
            teacher.lastName,
          email:
            teacher.email,
          phone:
            teacher.phone,
          status:
            teacher.status,
          qualification:
            profile.qualification,
          specialization:
            profile.specialization,
          joiningDate:
            profile.joiningDate,
          employeeType:
            profile.employeeType,
          passwordChanged:
            password !== undefined,
        },
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Teacher updated successfully",
      data: {
        teacher: {
          id: teacher._id,
          userId: teacher.userId,
          firstName:
            teacher.firstName,
          lastName:
            teacher.lastName,
          email:
            teacher.email,
          phone:
            teacher.phone,
          role:
            teacher.role,
          status:
            teacher.status,
          profile,
        },
      },
    });
  } catch (error) {
    console.error(
      "Update teacher error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Teacher update conflicts with existing data",
        code:
          "TEACHER_UPDATE_CONFLICT",
        errors: [],
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update teacher",
      code:
        "TEACHER_UPDATE_FAILED",
      errors: [],
    });
  }
};

/*
|--------------------------------------------------------------------------
| DEACTIVATE TEACHER
| Admin only
|--------------------------------------------------------------------------
*/

const deactivateTeacher = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const teacher =
      await User.findOne({
        _id: id,
        role: "teacher",
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
        code: "TEACHER_NOT_FOUND",
        errors: [],
      });
    }

    if (
      teacher.status === "inactive"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Teacher is already inactive",
        code:
          "TEACHER_ALREADY_INACTIVE",
        errors: [],
      });
    }

    teacher.status = "inactive";

    await teacher.save();

    await TeacherProfile.findOneAndUpdate(
      {
        user: teacher._id,
      },
      {
        status: "inactive",
      }
    );

    await createAuditLog({
      userId: getCurrentUserId(req),
      action: "TEACHER_DEACTIVATE",
      entity: "Teacher",
      entityId: teacher._id,
      metadata: {
        teacherId: teacher.userId,
        previousStatus: "active",
        newStatus: "inactive",
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Teacher deactivated successfully",
      data: {
        id: teacher._id,
        userId: teacher.userId,
        status: teacher.status,
      },
    });
  } catch (error) {
    console.error(
      "Deactivate teacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to deactivate teacher",
      code:
        "TEACHER_DEACTIVATE_FAILED",
      errors: [],
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACTIVATE TEACHER
| Admin only
|--------------------------------------------------------------------------
*/

const activateTeacher = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const teacher =
      await User.findOne({
        _id: id,
        role: "teacher",
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
        code: "TEACHER_NOT_FOUND",
        errors: [],
      });
    }

    if (
      teacher.status === "active"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Teacher is already active",
        code:
          "TEACHER_ALREADY_ACTIVE",
        errors: [],
      });
    }

    teacher.status = "active";

    await teacher.save();

    await TeacherProfile.findOneAndUpdate(
      {
        user: teacher._id,
      },
      {
        status: "active",
      }
    );

    await createAuditLog({
      userId: getCurrentUserId(req),
      action: "TEACHER_ACTIVATE",
      entity: "Teacher",
      entityId: teacher._id,
      metadata: {
        teacherId: teacher.userId,
        previousStatus: "inactive",
        newStatus: "active",
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Teacher activated successfully",
      data: {
        id: teacher._id,
        userId: teacher.userId,
        status: teacher.status,
      },
    });
  } catch (error) {
    console.error(
      "Activate teacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to activate teacher",
      code:
        "TEACHER_ACTIVATE_FAILED",
      errors: [],
    });
  }
};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deactivateTeacher,
  activateTeacher,
};