const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const academicSessionRoutes = require("./src/routes/academicSessionRoutes");
const programRoutes = require("./src/routes/programRoutes");
const classRoutes = require("./src/routes/classRoutes");
const sectionRoutes = require("./src/routes/sectionRoutes");
const subjectRoutes = require("./src/routes/subjectRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const parentRoutes = require("./src/routes/parentRoutes");
const guardianRoutes = require("./src/routes/guardianRoutes");
const admissionRoutes = require("./src/routes/admissionRoutes");
const feeStructureRoutes = require("./src/routes/feeStructureRoutes");
const feeAssignmentRoutes = require("./src/routes/feeAssignmentRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const razorpayRoutes = require("./src/routes/razorpayRoutes");
const razorpayWebhookRoutes = require("./src/routes/razorpayWebhookRoutes");
const membershipRoutes = require("./src/routes/membershipRoutes");
const renewalRoutes = require("./src/routes/renewalRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const progressRoutes = require("./src/routes/progressRoutes");
const scheduleRoutes = require("./src/routes/scheduleRoutes");
const queryRoutes = require("./src/routes/queryRoutes");
const trialBookingRoutes = require("./src/routes/trialBookingRoutes");
const auditLogRoutes = require("./src/routes/auditLogRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const enrollmentRoutes = require("./src/routes/enrollmentRoutes");
const {
  runRenewalNotificationJob,
} = require("./src/jobs/renewalNotificationJob");

const app = express();

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const { initializeSocket } = require("./src/services/socketService");

initializeSocket(httpServer);

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    errors: [],
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    errors: [],
  },
});

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/*
|--------------------------------------------------------------------------
| Rate Limiting
|--------------------------------------------------------------------------
*/

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

/*
|--------------------------------------------------------------------------
| Razorpay Webhook
|
| IMPORTANT:
| This route MUST come before express.json().
| Razorpay webhook signature verification requires
| the original raw request body.
|--------------------------------------------------------------------------
*/

app.use("/api/razorpay/webhook", razorpayWebhookRoutes);

/*
|--------------------------------------------------------------------------
| Request Body Limits
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/academic-sessions", academicSessionRoutes);

app.use("/api/programs", programRoutes);

app.use("/api/classes", classRoutes);

app.use("/api/sections", sectionRoutes);

app.use("/api/subjects", subjectRoutes);

app.use("/api/students", studentRoutes);

app.use("/api/guardians", guardianRoutes);

app.use("/api/parents", parentRoutes);

app.use("/api/admissions", admissionRoutes);

app.use("/api/fee-assignments", feeAssignmentRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/razorpay", razorpayRoutes);

app.use("/api/memberships", membershipRoutes);

app.use("/api/fee-structures", feeStructureRoutes);

app.use("/api/renewals", renewalRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/progress", progressRoutes);

app.use("/api/schedules", scheduleRoutes);

app.use("/api/queries", queryRoutes);

app.use("/api/trials", trialBookingRoutes);

app.use("/api/audit-logs", auditLogRoutes);

app.use("/api/teachers", teacherRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/dashboard", dashboardRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "School CRM API is running",
  });
});

/*
|--------------------------------------------------------------------------
| MongoDB Connection
|--------------------------------------------------------------------------
*/

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    /*
    |--------------------------------------------------------------------------
    | Renewal Notification Job
    |--------------------------------------------------------------------------
    */

    runRenewalNotificationJob();

    setInterval(
      () => {
        runRenewalNotificationJob();
      },
      60 * 60 * 1000,
    );
  });
};

startServer();
