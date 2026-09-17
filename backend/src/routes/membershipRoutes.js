const express = require("express");

const {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  suspendMembership,
  cancelMembership,
  activateMembership,
} = require("../controllers/membershipController");

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
  createMembership
);

router.get(
  "/",
  getMemberships
);

router.get(
  "/:id",
  getMembershipById
);

router.put(
  "/:id",
  updateMembership
);

router.put(
  "/:id/suspend",
  suspendMembership
);

router.put(
  "/:id/cancel",
  cancelMembership
);

router.put(
  "/:id/activate",
  activateMembership
);

module.exports = router;