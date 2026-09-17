const mongoose = require("mongoose");

const TrialBooking = require("../models/TrialBooking");
const User = require("../models/User");
const Class = require("../models/Class");

const STAFF_ROLES = ["admin", "teacher"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) => req.user?._id || req.user?.id || null;

const getRole = (req) => req.user?.role || null;

const isStaff = (req) => STAFF_ROLES.includes(getRole(req));

const isAdmin = (req) => getRole(req) === "admin";

const normalizeDate = (date) => {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);

  return parsed;
};

const isPastDate = (date) => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date < today;
};

const getCurrentYear = () => new Date().getFullYear();

const generateTrialNumber = async () => {
  const year = getCurrentYear();

  const lastTrial = await TrialBooking.findOne({
    trialNumber: new RegExp(`^TRIAL-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("trialNumber");

  let nextNumber = 1;

  if (lastTrial?.trialNumber) {
    const parts = lastTrial.trialNumber.split("-");
    const lastNumber = Number(parts[2]);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `TRIAL-${year}-${String(nextNumber).padStart(6, "0")}`;
};

const getPopulatedTrial = async (id) => {
  return TrialBooking.findById(id)
    .populate(
      "preferredClass",
      "name code description status program academicSession"
    )
    .populate(
      "assignedTo",
      "firstName lastName email phone role userId"
    )
    .populate(
      "convertedParent",
      "firstName lastName email phone role userId"
    )
    .populate(
      "convertedStudent",
      "firstName lastName email phone role userId"
    )
    .populate(
      "contactedBy",
      "firstName lastName email role userId"
    )
    .populate(
      "completedBy",
      "firstName lastName email role userId"
    )
    .populate(
      "cancelledBy",
      "firstName lastName email role userId"
    );
};

/*
|--------------------------------------------------------------------------
| Create Trial Booking
|--------------------------------------------------------------------------
| Public endpoint.
*/
const createTrialBooking = async (req, res) => {
  try {
    const {
      name,
      phone,
      email = "",
      preferredClass,
      preferredDate,
      message = "",
    } = req.body;

    if (!name || !phone || !preferredClass || !preferredDate) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone, preferred class and preferred date are required",
        code: "REQUIRED_FIELDS_MISSING",
      });
    }

    if (!isValidObjectId(preferredClass)) {
      return res.status(400).json({
        success: false,
        message: "Invalid preferred class ID",
        code: "INVALID_CLASS_ID",
      });
    }

    const classRecord = await Class.findById(preferredClass).select(
      "_id name code status program academicSession"
    );

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: "Preferred class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    if (classRecord.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is not available for an inactive class",
        code: "CLASS_INACTIVE",
      });
    }

    const trialDate = normalizeDate(preferredDate);

    if (!trialDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid preferred date",
        code: "INVALID_PREFERRED_DATE",
      });
    }

    if (isPastDate(trialDate)) {
      return res.status(400).json({
        success: false,
        message: "Preferred trial date cannot be in the past",
        code: "TRIAL_DATE_IN_PAST",
      });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
        code: "NAME_REQUIRED",
      });
    }

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
        code: "PHONE_REQUIRED",
      });
    }

    /*
     * Prevent obvious duplicate active bookings for the
     * same phone, class and date.
     */
    const existingBooking = await TrialBooking.findOne({
      phone: cleanPhone,
      preferredClass,
      preferredDate: trialDate,
      status: {
        $in: ["pending", "contacted", "approved"],
      },
    }).select("_id trialNumber status");

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "A trial booking already exists for this phone, class and date",
        code: "TRIAL_BOOKING_ALREADY_EXISTS",
        data: existingBooking,
      });
    }

    let trialNumber = await generateTrialNumber();

    let numberExists = await TrialBooking.exists({
      trialNumber,
    });

    while (numberExists) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);

      trialNumber = `TRIAL-${getCurrentYear()}-${randomSuffix}${Date.now()
        .toString()
        .slice(-3)}`;

      numberExists = await TrialBooking.exists({
        trialNumber,
      });
    }

    const trialBooking = await TrialBooking.create({
      trialNumber,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      preferredClass,
      preferredDate: trialDate,
      message: String(message).trim(),
      status: "pending",
    });

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(201).json({
      success: true,
      message: "Trial booking created successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("createTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create trial booking",
      code: "TRIAL_BOOKING_CREATE_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Trial Bookings
|--------------------------------------------------------------------------
| Staff/Admin only.
*/
const getTrialBookings = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can access trial bookings",
        code: "TRIAL_BOOKING_ACCESS_DENIED",
      });
    }

    const {
      status,
      preferredClass,
      assignedTo,
      phone,
      email,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) {
      const allowedStatuses = [
        "pending",
        "contacted",
        "approved",
        "rejected",
        "converted",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trial booking status",
          code: "INVALID_TRIAL_STATUS",
        });
      }

      filter.status = status;
    }

    if (preferredClass) {
      if (!isValidObjectId(preferredClass)) {
        return res.status(400).json({
          success: false,
          message: "Invalid preferred class ID",
          code: "INVALID_CLASS_ID",
        });
      }

      filter.preferredClass = preferredClass;
    }

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned staff ID",
          code: "INVALID_ASSIGNED_TO_ID",
        });
      }

      filter.assignedTo = assignedTo;
    }

    if (phone) {
      filter.phone = String(phone).trim();
    }

    if (email) {
      filter.email = String(email).trim().toLowerCase();
    }

    if (startDate || endDate) {
      filter.preferredDate = {};

      if (startDate) {
        const parsedStartDate = normalizeDate(startDate);

        if (!parsedStartDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
            code: "INVALID_START_DATE",
          });
        }

        filter.preferredDate.$gte = parsedStartDate;
      }

      if (endDate) {
        const parsedEndDate = normalizeDate(endDate);

        if (!parsedEndDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
            code: "INVALID_END_DATE",
          });
        }

        parsedEndDate.setHours(23, 59, 59, 999);

        filter.preferredDate.$lte = parsedEndDate;
      }
    }

    const parsedPage = Math.max(Number(page) || 1, 1);

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip = (parsedPage - 1) * parsedLimit;

    const [trials, total] = await Promise.all([
      TrialBooking.find(filter)
        .populate(
          "preferredClass",
          "name code description status program academicSession"
        )
        .populate(
          "assignedTo",
          "firstName lastName email phone role userId"
        )
        .populate(
          "convertedParent",
          "firstName lastName email phone role userId"
        )
        .populate(
          "convertedStudent",
          "firstName lastName email phone role userId"
        )
        .populate(
          "contactedBy",
          "firstName lastName email role userId"
        )
        .populate(
          "completedBy",
          "firstName lastName email role userId"
        )
        .populate(
          "cancelledBy",
          "firstName lastName email role userId"
        )
        .sort({ preferredDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),

      TrialBooking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Trial bookings fetched successfully",
      data: {
        trials,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("getTrialBookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trial bookings",
      code: "TRIAL_BOOKING_LIST_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Trial Booking By ID
|--------------------------------------------------------------------------
| Staff/Admin only.
*/
const getTrialBookingById = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can access trial booking details",
        code: "TRIAL_BOOKING_ACCESS_DENIED",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    const trialBooking = await getPopulatedTrial(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trial booking fetched successfully",
      data: trialBooking,
    });
  } catch (error) {
    console.error("getTrialBookingById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trial booking",
      code: "TRIAL_BOOKING_FETCH_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Assign Trial Booking
|--------------------------------------------------------------------------
| Admin/Teacher only.
*/
const assignTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can assign trial bookings",
        code: "TRIAL_ASSIGN_ACCESS_DENIED",
      });
    }

    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "assignedTo is required",
        code: "ASSIGNED_TO_REQUIRED",
      });
    }

    if (!isValidObjectId(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned staff ID",
        code: "INVALID_ASSIGNED_TO_ID",
      });
    }

    const staffUser = await User.findOne({
      _id: assignedTo,
      role: { $in: STAFF_ROLES },
      status: "active",
    }).select("_id firstName lastName email role userId");

    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: "Active staff member not found",
        code: "ASSIGNED_STAFF_NOT_FOUND",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (["cancelled", "completed", "converted"].includes(trialBooking.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled, completed or converted trial bookings cannot be reassigned",
        code: "TRIAL_BOOKING_REASSIGN_NOT_ALLOWED",
      });
    }

    trialBooking.assignedTo = assignedTo;

    if (trialBooking.status === "pending") {
      trialBooking.status = "contacted";
    }

    if (!trialBooking.contactedAt) {
      trialBooking.contactedAt = new Date();
      trialBooking.contactedBy = getUserId(req);
    }

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking assigned successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("assignTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign trial booking",
      code: "TRIAL_ASSIGN_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Mark Trial As Contacted
|--------------------------------------------------------------------------
*/
const markTrialContacted = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can update trial bookings",
        code: "TRIAL_CONTACT_ACCESS_DENIED",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (["cancelled", "completed", "converted"].includes(trialBooking.status)) {
      return res.status(400).json({
        success: false,
        message: "This trial booking cannot be marked as contacted",
        code: "TRIAL_CONTACT_NOT_ALLOWED",
      });
    }

    trialBooking.status = "contacted";
    trialBooking.contactedAt = new Date();
    trialBooking.contactedBy = getUserId(req);

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking marked as contacted",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("markTrialContacted error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update trial contact status",
      code: "TRIAL_CONTACT_UPDATE_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Approve Trial
|--------------------------------------------------------------------------
*/
const approveTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can approve trial bookings",
        code: "TRIAL_APPROVE_ACCESS_DENIED",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (trialBooking.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is already approved",
        code: "TRIAL_ALREADY_APPROVED",
      });
    }

    if (
      ["cancelled", "completed", "converted", "rejected"].includes(
        trialBooking.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This trial booking cannot be approved",
        code: "TRIAL_APPROVAL_NOT_ALLOWED",
      });
    }

    trialBooking.status = "approved";

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking approved successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("approveTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve trial booking",
      code: "TRIAL_APPROVE_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Reject Trial
|--------------------------------------------------------------------------
*/
const rejectTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can reject trial bookings",
        code: "TRIAL_REJECT_ACCESS_DENIED",
      });
    }

    const { id } = req.params;
    const { notes = "" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (["cancelled", "completed", "converted"].includes(trialBooking.status)) {
      return res.status(400).json({
        success: false,
        message: "This trial booking cannot be rejected",
        code: "TRIAL_REJECTION_NOT_ALLOWED",
      });
    }

    if (trialBooking.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is already rejected",
        code: "TRIAL_ALREADY_REJECTED",
      });
    }

    trialBooking.status = "rejected";
    trialBooking.notes = String(notes).trim();

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking rejected successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("rejectTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject trial booking",
      code: "TRIAL_REJECT_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Convert Trial
|--------------------------------------------------------------------------
| Conversion references are stored here.
| Actual parent/student creation should happen through the
| existing parent/student modules.
*/
const convertTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can convert trial bookings",
        code: "TRIAL_CONVERT_ACCESS_DENIED",
      });
    }

    const { id } = req.params;
    const { parentId, studentId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    if (!parentId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "parentId and studentId are required",
        code: "CONVERSION_DETAILS_REQUIRED",
      });
    }

    if (!isValidObjectId(parentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent ID",
        code: "INVALID_PARENT_ID",
      });
    }

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
        code: "INVALID_STUDENT_ID",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (trialBooking.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is already converted",
        code: "TRIAL_ALREADY_CONVERTED",
      });
    }

    if (["cancelled", "rejected", "completed"].includes(trialBooking.status)) {
      return res.status(400).json({
        success: false,
        message: "This trial booking cannot be converted",
        code: "TRIAL_CONVERSION_NOT_ALLOWED",
      });
    }

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
      status: "active",
    }).select("_id firstName lastName email phone userId");

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Active parent not found",
        code: "PARENT_NOT_FOUND",
      });
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
      status: "active",
    }).select("_id firstName lastName email phone userId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Active student not found",
        code: "STUDENT_NOT_FOUND",
      });
    }

    trialBooking.convertedParent = parentId;
    trialBooking.convertedStudent = studentId;
    trialBooking.status = "converted";

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking converted successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("convertTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to convert trial booking",
      code: "TRIAL_CONVERSION_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Complete Trial
|--------------------------------------------------------------------------
*/
const completeTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can complete trial bookings",
        code: "TRIAL_COMPLETE_ACCESS_DENIED",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (trialBooking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is already completed",
        code: "TRIAL_ALREADY_COMPLETED",
      });
    }

    if (
      ["cancelled", "rejected"].includes(trialBooking.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "This trial booking cannot be completed",
        code: "TRIAL_COMPLETION_NOT_ALLOWED",
      });
    }

    trialBooking.status = "completed";
    trialBooking.completedAt = new Date();
    trialBooking.completedBy = getUserId(req);

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking completed successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("completeTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete trial booking",
      code: "TRIAL_COMPLETE_FAILED",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Cancel Trial
|--------------------------------------------------------------------------
*/
const cancelTrialBooking = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can cancel trial bookings",
        code: "TRIAL_CANCEL_ACCESS_DENIED",
      });
    }

    const { id } = req.params;
    const { cancellationReason = "" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trial booking ID",
        code: "INVALID_TRIAL_BOOKING_ID",
      });
    }

    if (!String(cancellationReason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
        code: "CANCELLATION_REASON_REQUIRED",
      });
    }

    const trialBooking = await TrialBooking.findById(id);

    if (!trialBooking) {
      return res.status(404).json({
        success: false,
        message: "Trial booking not found",
        code: "TRIAL_BOOKING_NOT_FOUND",
      });
    }

    if (trialBooking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trial booking is already cancelled",
        code: "TRIAL_ALREADY_CANCELLED",
      });
    }

    if (
      ["completed", "converted"].includes(trialBooking.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Completed or converted trials cannot be cancelled",
        code: "TRIAL_CANCELLATION_NOT_ALLOWED",
      });
    }

    trialBooking.status = "cancelled";
    trialBooking.cancelledAt = new Date();
    trialBooking.cancelledBy = getUserId(req);
    trialBooking.cancellationReason = String(
      cancellationReason
    ).trim();

    await trialBooking.save();

    const populatedTrial = await getPopulatedTrial(trialBooking._id);

    return res.status(200).json({
      success: true,
      message: "Trial booking cancelled successfully",
      data: populatedTrial,
    });
  } catch (error) {
    console.error("cancelTrialBooking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel trial booking",
      code: "TRIAL_CANCEL_FAILED",
      error: error.message,
    });
  }
};

module.exports = {
  createTrialBooking,
  getTrialBookings,
  getTrialBookingById,
  assignTrialBooking,
  markTrialContacted,
  approveTrialBooking,
  rejectTrialBooking,
  convertTrialBooking,
  completeTrialBooking,
  cancelTrialBooking,
};