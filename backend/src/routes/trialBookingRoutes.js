const express = require("express");

const {
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
} = require("../controllers/trialBookingController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Visitor Trial Booking
|--------------------------------------------------------------------------
*/
router.post("/visitor", createTrialBooking);

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/
router.use(protect);

/*
|--------------------------------------------------------------------------
| Staff/Admin Trial Booking Management
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authorize("admin", "teacher"),
  getTrialBookings
);

router.get(
  "/:id",
  authorize("admin", "teacher"),
  getTrialBookingById
);

router.put(
  "/:id/assign",
  authorize("admin", "teacher"),
  assignTrialBooking
);

router.put(
  "/:id/contact",
  authorize("admin", "teacher"),
  markTrialContacted
);

router.put(
  "/:id/approve",
  authorize("admin", "teacher"),
  approveTrialBooking
);

router.put(
  "/:id/reject",
  authorize("admin", "teacher"),
  rejectTrialBooking
);

router.put(
  "/:id/convert",
  authorize("admin", "teacher"),
  convertTrialBooking
);

router.put(
  "/:id/complete",
  authorize("admin", "teacher"),
  completeTrialBooking
);

router.put(
  "/:id/cancel",
  authorize("admin", "teacher"),
  cancelTrialBooking
);

module.exports = router;