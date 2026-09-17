const Admission = require("../models/Admission");

const generateAdmissionNumber = async () => {
  const year = new Date().getFullYear();

  const regex = new RegExp(
    `^ADMISSION-${year}-`
  );

  const latestAdmission = await Admission.findOne({
    admissionNumber: regex,
  })
    .sort({ admissionNumber: -1 })
    .select("admissionNumber");

  let nextNumber = 1;

  if (latestAdmission?.admissionNumber) {
    const parts =
      latestAdmission.admissionNumber.split("-");

    const lastNumber = parseInt(parts[2], 10);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `ADMISSION-${year}-${String(nextNumber).padStart(
    6,
    "0"
  )}`;
};

module.exports = generateAdmissionNumber;