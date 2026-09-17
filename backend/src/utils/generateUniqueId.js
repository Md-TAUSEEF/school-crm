const User = require("../models/User");

const generateUniqueId = async (role) => {
  let prefix;

  switch (role) {
    case "student":
      prefix = "STU";
      break;

    case "parent":
      prefix = "PAR";
      break;

    case "teacher":
      prefix = "TCH";
      break;

    case "admin":
      prefix = "ADM";
      break;

    default:
      throw new Error("Invalid user role");
  }

  const year = new Date().getFullYear();

  const regex = new RegExp(`^${prefix}-${year}-`);

  const latestUser = await User.findOne({
    userId: regex,
  })
    .sort({ userId: -1 })
    .select("userId");

  let nextNumber = 1;

  if (latestUser?.userId) {
    const parts = latestUser.userId.split("-");
    const lastNumber = parseInt(parts[2], 10);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateUniqueId;