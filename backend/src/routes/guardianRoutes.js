const express = require("express");

const {
  createGuardianRelationship,
  getStudentGuardians,
  getParentChildren,
  updateGuardianRelationship,
  deleteGuardianRelationship,
} = require("../controllers/guardianController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post(
  "/",
  createGuardianRelationship
);

router.get(
  "/student/:studentId",
  getStudentGuardians
);

router.get(
  "/parent/:parentId",
  getParentChildren
);

router.put(
  "/:id",
  updateGuardianRelationship
);

router.delete(
  "/:id",
  deleteGuardianRelationship
);

module.exports = router;