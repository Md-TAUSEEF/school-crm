const User = require("../models/User");

const Program = require("../models/Program");
const AcademicSession = require("../models/AcademicSession");
const Class = require("../models/Class");
const Section = require("../models/Section");
const Subject = require("../models/Subject");
const Schedule = require("../models/Schedule");

const Admission = require("../models/Admission");
const Enrollment = require("../models/Enrollment");

const Membership = require("../models/Membership");
const FeeAssignment = require("../models/FeeAssignment");
const Payment = require("../models/Payment");
const Renewal = require("../models/Renewal");

const Attendance = require("../models/Attendance");
const Query = require("../models/Query");
const TrialBooking = require("../models/TrialBooking");

const AuditLog = require("../models/AuditLog");

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const getStartOfDay = (date = new Date()) => {
  const value = new Date(date);

  value.setHours(0, 0, 0, 0);

  return value;
};

const getEndOfDay = (date = new Date()) => {
  const value = new Date(date);

  value.setHours(23, 59, 59, 999);

  return value;
};

const getStartOfMonth = (date = new Date()) => {
  const value = new Date(date);

  value.setDate(1);
  value.setHours(0, 0, 0, 0);

  return value;
};

const getEndOfMonth = (date = new Date()) => {
  const value = new Date(date);

  value.setMonth(value.getMonth() + 1);
  value.setDate(0);
  value.setHours(23, 59, 59, 999);

  return value;
};

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

const getDashboard = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);

    const startOfMonth = getStartOfMonth(now);
    const endOfMonth = getEndOfMonth(now);

    const membershipExpiry7Days = new Date(
      startOfToday
    );

    membershipExpiry7Days.setDate(
      membershipExpiry7Days.getDate() + 7
    );

    const membershipExpiry30Days = new Date(
      startOfToday
    );

    membershipExpiry30Days.setDate(
      membershipExpiry30Days.getDate() + 30
    );

    /*
    |--------------------------------------------------------------------------
    | ADMIN DASHBOARD
    |--------------------------------------------------------------------------
    */

    if (req.user?.role === "admin") {
      const [
        /*
        |--------------------------------------------------------------------------
        | USERS
        |--------------------------------------------------------------------------
        */

        totalStudents,
        activeStudents,
        inactiveStudents,

        totalParents,
        activeParents,
        inactiveParents,

        totalTeachers,
        activeTeachers,
        inactiveTeachers,

        /*
        |--------------------------------------------------------------------------
        | ACADEMIC
        |--------------------------------------------------------------------------
        */

        totalPrograms,
        activePrograms,

        totalAcademicSessions,
        activeAcademicSessions,

        totalClasses,
        activeClasses,

        totalSections,
        activeSections,

        totalSubjects,
        activeSubjects,

        totalSchedules,
        activeSchedules,

        /*
        |--------------------------------------------------------------------------
        | ADMISSIONS
        |--------------------------------------------------------------------------
        */

        totalAdmissions,
        pendingAdmissions,
        approvedAdmissions,
        rejectedAdmissions,
        cancelledAdmissions,

        /*
        |--------------------------------------------------------------------------
        | ENROLLMENTS
        |--------------------------------------------------------------------------
        */

        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        transferredEnrollments,
        withdrawnEnrollments,
        cancelledEnrollments,

        /*
        |--------------------------------------------------------------------------
        | MEMBERSHIPS
        |--------------------------------------------------------------------------
        */

        pendingMemberships,
        activeMemberships,
        expiringMemberships,
        expiring7Days,
        expiredMemberships,
        suspendedMemberships,
        cancelledMemberships,

        /*
        |--------------------------------------------------------------------------
        | FEE ASSIGNMENTS
        |--------------------------------------------------------------------------
        */

        totalFeeAssignments,
        dueFeeAssignments,
        partialFeeAssignments,
        paidFeeAssignments,
        overdueFeeAssignments,

        /*
        |--------------------------------------------------------------------------
        | PAYMENTS
        |--------------------------------------------------------------------------
        */

        successfulPayments,
        pendingPayments,
        failedPayments,
        cancelledPayments,
        refundedPayments,

        todaySuccessfulPayments,
        monthSuccessfulPayments,

        /*
        |--------------------------------------------------------------------------
        | PAYMENT AMOUNTS
        |--------------------------------------------------------------------------
        */

        todayPaymentAmount,
        monthPaymentAmount,

        /*
        |--------------------------------------------------------------------------
        | ATTENDANCE
        |--------------------------------------------------------------------------
        */

        todayAttendance,
        todayPresent,
        todayAbsent,
        todayLate,
        todayExcused,

        /*
        |--------------------------------------------------------------------------
        | RENEWALS
        |--------------------------------------------------------------------------
        */

        pendingRenewals,
        approvedRenewals,
        partialRenewals,
        completedRenewals,
        cancelledRenewals,

        /*
        |--------------------------------------------------------------------------
        | QUERIES
        |--------------------------------------------------------------------------
        */

        totalQueries,
        newQueries,
        openQueries,
        inProgressQueries,
        resolvedQueries,
        closedQueries,

        /*
        |--------------------------------------------------------------------------
        | TRIALS
        |--------------------------------------------------------------------------
        */

        pendingTrials,
        confirmedTrials,
        completedTrials,
        cancelledTrials,
        todayTrials,

        /*
        |--------------------------------------------------------------------------
        | AUDIT LOGS
        |--------------------------------------------------------------------------
        */

        recentActivity,
      ] = await Promise.all([
        /*
        |--------------------------------------------------------------------------
        | USERS
        |--------------------------------------------------------------------------
        */

        User.countDocuments({
          role: "student",
        }),

        User.countDocuments({
          role: "student",
          status: "active",
        }),

        User.countDocuments({
          role: "student",
          status: {
            $ne: "active",
          },
        }),

        User.countDocuments({
          role: "parent",
        }),

        User.countDocuments({
          role: "parent",
          status: "active",
        }),

        User.countDocuments({
          role: "parent",
          status: {
            $ne: "active",
          },
        }),

        User.countDocuments({
          role: "teacher",
        }),

        User.countDocuments({
          role: "teacher",
          status: "active",
        }),

        User.countDocuments({
          role: "teacher",
          status: {
            $ne: "active",
          },
        }),

        /*
        |--------------------------------------------------------------------------
        | ACADEMIC
        |--------------------------------------------------------------------------
        */

        Program.countDocuments(),

        Program.countDocuments({
          status: "active",
        }),

        AcademicSession.countDocuments(),

        AcademicSession.countDocuments({
          status: "active",
        }),

        Class.countDocuments(),

        Class.countDocuments({
          status: "active",
        }),

        Section.countDocuments(),

        Section.countDocuments({
          status: "active",
        }),

        Subject.countDocuments(),

        Subject.countDocuments({
          status: "active",
        }),

        Schedule.countDocuments(),

        Schedule.countDocuments({
          status: "active",
        }),

        /*
        |--------------------------------------------------------------------------
        | ADMISSIONS
        |--------------------------------------------------------------------------
        */

        Admission.countDocuments(),

        Admission.countDocuments({
          status: "pending",
        }),

        Admission.countDocuments({
          status: "approved",
        }),

        Admission.countDocuments({
          status: "rejected",
        }),

        Admission.countDocuments({
          status: "cancelled",
        }),

        /*
        |--------------------------------------------------------------------------
        | ENROLLMENTS
        |--------------------------------------------------------------------------
        */

        Enrollment.countDocuments(),

        Enrollment.countDocuments({
          status: "active",
        }),

        Enrollment.countDocuments({
          status: "completed",
        }),

        Enrollment.countDocuments({
          status: "transferred",
        }),

        Enrollment.countDocuments({
          status: "withdrawn",
        }),

        Enrollment.countDocuments({
          status: "cancelled",
        }),

        /*
        |--------------------------------------------------------------------------
        | MEMBERSHIPS
        |--------------------------------------------------------------------------
        */

        Membership.countDocuments({
          status: "pending",
        }),

        Membership.countDocuments({
          startDate: {
            $lte: now,
          },

          endDate: {
            $gte: now,
          },

          status: {
            $nin: [
              "cancelled",
              "suspended",
            ],
          },
        }),

        Membership.countDocuments({
          startDate: {
            $lte: now,
          },

          endDate: {
            $gte: startOfToday,

            $lte: membershipExpiry30Days,
          },

          status: {
            $nin: [
              "cancelled",
              "suspended",
            ],
          },
        }),

        Membership.countDocuments({
          startDate: {
            $lte: now,
          },

          endDate: {
            $gte: startOfToday,

            $lte: membershipExpiry7Days,
          },

          status: {
            $nin: [
              "cancelled",
              "suspended",
            ],
          },
        }),

        Membership.countDocuments({
          endDate: {
            $lt: startOfToday,
          },

          status: {
            $ne: "cancelled",
          },
        }),

        Membership.countDocuments({
          status: "suspended",
        }),

        Membership.countDocuments({
          status: "cancelled",
        }),

        /*
        |--------------------------------------------------------------------------
        | FEE ASSIGNMENTS
        |--------------------------------------------------------------------------
        */

        FeeAssignment.countDocuments(),

        FeeAssignment.countDocuments({
          status: "due",
        }),

        FeeAssignment.countDocuments({
          status: "partial",
        }),

        FeeAssignment.countDocuments({
          status: "paid",
        }),

        FeeAssignment.countDocuments({
          status: "overdue",
        }),

        /*
        |--------------------------------------------------------------------------
        | PAYMENTS
        |--------------------------------------------------------------------------
        */

        Payment.countDocuments({
          paymentStatus: "success",
        }),

        Payment.countDocuments({
          paymentStatus: "pending",
        }),

        Payment.countDocuments({
          paymentStatus: "failed",
        }),

        Payment.countDocuments({
          paymentStatus: "cancelled",
        }),

        Payment.countDocuments({
          paymentStatus: "refunded",
        }),

        Payment.countDocuments({
          paymentStatus: "success",

          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        }),

        Payment.countDocuments({
          paymentStatus: "success",

          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        }),

        /*
        |--------------------------------------------------------------------------
        | PAYMENT AMOUNTS
        |--------------------------------------------------------------------------
        |
        | amount field is used from Payment model.
        |
        */

        Payment.aggregate([
          {
            $match: {
              paymentStatus: "success",

              createdAt: {
                $gte: startOfToday,
                $lte: endOfToday,
              },
            },
          },

          {
            $group: {
              _id: null,

              total: {
                $sum: "$amount",
              },
            },
          },
        ]),

        Payment.aggregate([
          {
            $match: {
              paymentStatus: "success",

              createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth,
              },
            },
          },

          {
            $group: {
              _id: null,

              total: {
                $sum: "$amount",
              },
            },
          },
        ]),

        /*
        |--------------------------------------------------------------------------
        | ATTENDANCE
        |--------------------------------------------------------------------------
        */

        Attendance.countDocuments({
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        }),

        Attendance.countDocuments({
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "present",
        }),

        Attendance.countDocuments({
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "absent",
        }),

        Attendance.countDocuments({
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "late",
        }),

        Attendance.countDocuments({
          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "excused",
        }),

        /*
        |--------------------------------------------------------------------------
        | RENEWALS
        |--------------------------------------------------------------------------
        */

        Renewal.countDocuments({
          status: "pending",
        }),

        Renewal.countDocuments({
          status: "approved",
        }),

        Renewal.countDocuments({
          paymentStatus: "partial",

          status: {
            $nin: [
              "cancelled",
              "completed",
            ],
          },
        }),

        Renewal.countDocuments({
          status: "completed",
        }),

        Renewal.countDocuments({
          status: "cancelled",
        }),

        /*
        |--------------------------------------------------------------------------
        | QUERIES
        |--------------------------------------------------------------------------
        */

        Query.countDocuments(),

        Query.countDocuments({
          status: "new",
        }),

        Query.countDocuments({
          status: "open",
        }),

        Query.countDocuments({
          status: "in_progress",
        }),

        Query.countDocuments({
          status: "resolved",
        }),

        Query.countDocuments({
          status: "closed",
        }),

        /*
        |--------------------------------------------------------------------------
        | TRIAL BOOKINGS
        |--------------------------------------------------------------------------
        */

        TrialBooking.countDocuments({
          status: "pending",
        }),

        TrialBooking.countDocuments({
          status: "confirmed",
        }),

        TrialBooking.countDocuments({
          status: "completed",
        }),

        TrialBooking.countDocuments({
          status: "cancelled",
        }),

        TrialBooking.countDocuments({
          status: "pending",

          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        }),

        /*
        |--------------------------------------------------------------------------
        | RECENT ACTIVITY
        |--------------------------------------------------------------------------
        |
        | AuditLog uses userId, not performedBy.
        |
        */

        AuditLog.find({})
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .populate(
            "userId",
            "firstName lastName email role userId"
          )
          .lean(),
      ]);

      /*
      |--------------------------------------------------------------------------
      | PAYMENT TOTALS
      |--------------------------------------------------------------------------
      */

      const todayCollectedAmount =
        todayPaymentAmount?.[0]?.total || 0;

      const monthCollectedAmount =
        monthPaymentAmount?.[0]?.total || 0;

      /*
      |--------------------------------------------------------------------------
      | ATTENDANCE PERCENTAGE
      |--------------------------------------------------------------------------
      */

      const attendancePercentage =
        todayAttendance > 0
          ? Number(
              (
                (todayPresent /
                  todayAttendance) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        message:
          "Dashboard data fetched successfully",

        data: {
          /*
          |--------------------------------------------------------------------------
          | USERS
          |--------------------------------------------------------------------------
          */

          users: {
            students: {
              total: totalStudents,
              active: activeStudents,
              inactive: inactiveStudents,
            },

            parents: {
              total: totalParents,
              active: activeParents,
              inactive: inactiveParents,
            },

            teachers: {
              total: totalTeachers,
              active: activeTeachers,
              inactive: inactiveTeachers,
            },
          },

          /*
          |--------------------------------------------------------------------------
          | ACADEMIC
          |--------------------------------------------------------------------------
          */

          academics: {
            programs: {
              total: totalPrograms,
              active: activePrograms,
            },

            academicSessions: {
              total: totalAcademicSessions,
              active: activeAcademicSessions,
            },

            classes: {
              total: totalClasses,
              active: activeClasses,
            },

            sections: {
              total: totalSections,
              active: activeSections,
            },

            subjects: {
              total: totalSubjects,
              active: activeSubjects,
            },

            schedules: {
              total: totalSchedules,
              active: activeSchedules,
            },
          },

          /*
          |--------------------------------------------------------------------------
          | ADMISSIONS
          |--------------------------------------------------------------------------
          */

          admissions: {
            total: totalAdmissions,
            pending: pendingAdmissions,
            approved: approvedAdmissions,
            rejected: rejectedAdmissions,
            cancelled: cancelledAdmissions,
          },

          /*
          |--------------------------------------------------------------------------
          | ENROLLMENTS
          |--------------------------------------------------------------------------
          */

          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            completed: completedEnrollments,
            transferred: transferredEnrollments,
            withdrawn: withdrawnEnrollments,
            cancelled: cancelledEnrollments,
          },

          /*
          |--------------------------------------------------------------------------
          | MEMBERSHIPS
          |--------------------------------------------------------------------------
          */

          memberships: {
            pending: pendingMemberships,
            active: activeMemberships,
            expiring: expiringMemberships,
            expiring7Days,
            expired: expiredMemberships,
            suspended: suspendedMemberships,
            cancelled: cancelledMemberships,
          },

          /*
          |--------------------------------------------------------------------------
          | FEES
          |--------------------------------------------------------------------------
          */

          fees: {
            assignments: {
              total: totalFeeAssignments,
              due: dueFeeAssignments,
              partial: partialFeeAssignments,
              paid: paidFeeAssignments,
              overdue: overdueFeeAssignments,
            },
          },

          /*
          |--------------------------------------------------------------------------
          | PAYMENTS
          |--------------------------------------------------------------------------
          */

          payments: {
            successful: successfulPayments,
            pending: pendingPayments,
            failed: failedPayments,
            cancelled: cancelledPayments,
            refunded: refundedPayments,

            today: {
              count: todaySuccessfulPayments,
              amount: todayCollectedAmount,
            },

            month: {
              count: monthSuccessfulPayments,
              amount: monthCollectedAmount,
            },
          },

          /*
          |--------------------------------------------------------------------------
          | ATTENDANCE
          |--------------------------------------------------------------------------
          */

          attendance: {
            total: todayAttendance,
            present: todayPresent,
            absent: todayAbsent,
            late: todayLate,
            excused: todayExcused,

            percentage:
              attendancePercentage,
          },

          /*
          |--------------------------------------------------------------------------
          | RENEWALS
          |--------------------------------------------------------------------------
          */

          renewals: {
            pending: pendingRenewals,
            approved: approvedRenewals,
            partial: partialRenewals,
            completed: completedRenewals,
            cancelled: cancelledRenewals,
          },

          /*
          |--------------------------------------------------------------------------
          | QUERIES
          |--------------------------------------------------------------------------
          */

          queries: {
            total: totalQueries,
            new: newQueries,
            open: openQueries,
            inProgress: inProgressQueries,
            resolved: resolvedQueries,
            closed: closedQueries,
          },

          /*
          |--------------------------------------------------------------------------
          | TRIALS
          |--------------------------------------------------------------------------
          */

          trials: {
            pending: pendingTrials,
            confirmed: confirmedTrials,
            completed: completedTrials,
            cancelled: cancelledTrials,
            today: todayTrials,
          },

          /*
          |--------------------------------------------------------------------------
          | RECENT ACTIVITY
          |--------------------------------------------------------------------------
          */

          recentActivity,

          /*
          |--------------------------------------------------------------------------
          | META
          |--------------------------------------------------------------------------
          */

          generatedAt: now,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | TEACHER DASHBOARD
    |--------------------------------------------------------------------------
    */

    if (req.user?.role === "teacher") {
      const teacherId =
        req.user?._id ||
        req.user?.id;

      const [
        teacherSchedules,
        teacherAttendance,
        teacherPresent,
        teacherAbsent,
        teacherLate,
        teacherExcused,
        teacherActivity,
      ] = await Promise.all([
        /*
        |--------------------------------------------------------------------------
        | Teacher Assignments
        |--------------------------------------------------------------------------
        */

        Schedule.find({
          instructor: teacherId,
          status: "active",
        })
          .populate(
            "program",
            "name code"
          )
          .populate(
            "academicSession",
            "name code status"
          )
          .populate(
            "class",
            "name code"
          )
          .populate(
            "section",
            "name code"
          )
          .populate(
            "subject",
            "name code"
          )
          .lean(),

        /*
        |--------------------------------------------------------------------------
        | Teacher Attendance
        |--------------------------------------------------------------------------
        */

        Attendance.countDocuments({
          markedBy: teacherId,

          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        }),

        Attendance.countDocuments({
          markedBy: teacherId,

          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "present",
        }),

        Attendance.countDocuments({
          markedBy: teacherId,

          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "absent",
        }),

        Attendance.countDocuments({
          markedBy: teacherId,

          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "late",
        }),

        Attendance.countDocuments({
          markedBy: teacherId,

          date: {
            $gte: startOfToday,
            $lte: endOfToday,
          },

          status: "excused",
        }),

        /*
        |--------------------------------------------------------------------------
        | Teacher Recent Activity
        |--------------------------------------------------------------------------
        */

        AuditLog.find({
          userId: teacherId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .lean(),
      ]);

      const teacherAttendancePercentage =
        teacherAttendance > 0
          ? Number(
              (
                (teacherPresent /
                  teacherAttendance) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
      |--------------------------------------------------------------------------
      | Teacher Response
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        message:
          "Teacher dashboard data fetched successfully",

        data: {
          assignments: {
            total:
              teacherSchedules.length,

            active:
              teacherSchedules.length,

            items: teacherSchedules,
          },

          attendance: {
            total: teacherAttendance,
            present: teacherPresent,
            absent: teacherAbsent,
            late: teacherLate,
            excused: teacherExcused,

            percentage:
              teacherAttendancePercentage,
          },

          recentActivity:
            teacherActivity,

          generatedAt: now,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESS DENIED
    |--------------------------------------------------------------------------
    */

    return res.status(403).json({
      success: false,

      message:
        "Dashboard access denied",

      errors: [],
    });
  } catch (error) {
    console.error(
      "Dashboard controller error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch dashboard data",

      errors: [
        {
          message: error.message,
        },
      ],
    });
  }
};

module.exports = {
  getDashboard,
};