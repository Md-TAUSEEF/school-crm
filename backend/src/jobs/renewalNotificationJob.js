const Membership = require("../models/Membership");
const Renewal = require("../models/Renewal");
const User = require("../models/User");
const Notification = require("../models/Notification");

const { createNotifications } = require("../services/notificationService");

const REMINDER_DAYS = [7, 3, 1];

const getStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getEndOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const getReminderKey = (membershipId, key) =>
  `membership-${membershipId}-${key}`;

const sendRenewalNotification = async ({
  membership,
  parentIds,
  reminderKey,
  type,
  title,
  message,
}) => {
  if (!parentIds.length) {
    return;
  }

  const existingNotification = await Notification.findOne({
    recipient: { $in: parentIds },
    type,
    relatedEntity: "Membership",
    relatedEntityId: membership._id,
    "metadata.reminderKey": reminderKey,
  }).lean();

  if (existingNotification) {
    return;
  }

  const studentName =
    `${membership.student.firstName || ""} ${
      membership.student.lastName || ""
    }`.trim();

  await createNotifications({
    recipients: parentIds,
    type,
    title,
    message: message.replace("{{studentName}}", studentName),
    relatedEntity: "Membership",
    relatedEntityId: membership._id,
    metadata: {
      membershipId: membership._id,
      studentId: membership.student._id,
      membershipName: membership.membershipName,
      membershipCode: membership.membershipCode,
      endDate: membership.endDate,
      reminderKey,
    },
    channels: ["in_app"],
  });
};

const runRenewalNotificationJob = async () => {
  try {
    const now = new Date();
    const todayStart = getStartOfDay(now);

    const maxReminderDate = new Date(todayStart);
    maxReminderDate.setDate(
      maxReminderDate.getDate() + 7
    );

    const memberships = await Membership.find({
      status: {
        $in: ["active", "expiring", "expired"],
      },
      endDate: {
        $lte: getEndOfDay(maxReminderDate),
      },
    })
      .populate({
        path: "student",
        select: "firstName lastName userId role status parents",
      })
      .lean();

    for (const membership of memberships) {
      if (!membership.student) {
        continue;
      }

      if (membership.student.role !== "student") {
        continue;
      }

      if (membership.student.status !== "active") {
        continue;
      }

      const parentIds = Array.isArray(membership.student.parents)
        ? membership.student.parents
        : [];

      if (!parentIds.length) {
        continue;
      }

      const membershipEndDate = getStartOfDay(
        membership.endDate
      );

      const diffMs =
        membershipEndDate.getTime() -
        todayStart.getTime();

      const daysRemaining = Math.round(
        diffMs / (1000 * 60 * 60 * 24)
      );

      // Renewal reminders: 7, 3 and 1 day before expiry.
      if (REMINDER_DAYS.includes(daysRemaining)) {
        const existingCompletedRenewal =
          await Renewal.exists({
            previousMembership: membership._id,
            status: "completed",
            paymentStatus: "paid",
          });

        if (existingCompletedRenewal) {
          continue;
        }

        const reminderKey = getReminderKey(
          membership._id,
          `${daysRemaining}-days`
        );

        await sendRenewalNotification({
          membership,
          parentIds,
          reminderKey,
          type: "renewal_reminder",
          title: "Membership Renewal Reminder",
          message:
            "{{studentName}}'s membership will expire in " +
            `${daysRemaining} day${
              daysRemaining === 1 ? "" : "s"
            }. Please renew the membership.`,
        });

        continue;
      }

      // Overdue notification after membership expiry.
      if (daysRemaining < 0) {
        const existingCompletedRenewal =
          await Renewal.exists({
            previousMembership: membership._id,
            status: "completed",
            paymentStatus: "paid",
          });

        if (existingCompletedRenewal) {
          continue;
        }

        const reminderKey = getReminderKey(
          membership._id,
          "overdue"
        );

        await sendRenewalNotification({
          membership,
          parentIds,
          reminderKey,
          type: "renewal_overdue",
          title: "Membership Renewal Overdue",
          message:
            "{{studentName}}'s membership has expired. " +
            "Please complete the renewal.",
        });
      }
    }

    console.log("Renewal notification job completed.");
  } catch (error) {
    console.error(
      "Renewal notification job error:",
      error.message
    );
  }
};

module.exports = {
  runRenewalNotificationJob,
};