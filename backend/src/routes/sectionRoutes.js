const express = require("express");

const {
  createSection,
  getSections,
  getSectionById,
  getSectionStudents,
  updateSection,
  deleteSection,
} = require("../controllers/sectionController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(
  protect,
  authorize("admin")
);

router.post(
  "/",
  createSection
);

router.get(
  "/",
  getSections
);

/**
 * Section students
 *
 * Only:
 * - active membership
 * - active enrollment
 * - matching class
 * - matching section
 * - matching academic session
 */
router.get(
  "/:id/students",
  getSectionStudents
);

/**
 * Section details
 */
router.get(
  "/:id",
  getSectionById
);

router.put(
  "/:id",
  updateSection
);

router.delete(
  "/:id",
  deleteSection
);

module.exports = router;