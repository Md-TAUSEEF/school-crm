import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Layers3,
  ListChecks,
  MessageSquare,
  RefreshCcw,
  School,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { api, getMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Stat Card
|--------------------------------------------------------------------------
*/

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  iconClass = "bg-slate-100 text-slate-700",
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          ].join(" ")}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Section Header
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  title,
  description,
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-950">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Small Summary Row
|--------------------------------------------------------------------------
*/

const SummaryRow = ({
  label,
  value,
  valueClass = "text-slate-950",
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-sm font-bold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

const Dashboard = () => {
  const { user } = useAuth();

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Dashboard
  |--------------------------------------------------------------------------
  */

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/dashboard"
      );

      const data =
        response?.data?.data || null;

      setDashboard(data);
    } catch (err) {
      console.error(
        "Dashboard fetch error:",
        err
      );

      setDashboard(null);

      setError(
        getMessage(
          err,
          "Unable to load dashboard"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const getNumber = (...values) => {
    for (const value of values) {
      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        return value;
      }
    }

    return 0;
  };

  const formatAmount = (amount) => {
    const value = Number(amount || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatActivityAction = (action) => {
    if (!action) {
      return "Activity";
    }

    return String(action)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  const formatActivityEntity = (entity) => {
    if (!entity) {
      return "";
    }

    return String(entity)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  /*
  |--------------------------------------------------------------------------
  | User Role
  |--------------------------------------------------------------------------
  */

  const isTeacher =
    user?.role === "teacher";

  const isAdmin =
    user?.role === "admin";

  /*
  |--------------------------------------------------------------------------
  | ADMIN DATA
  |--------------------------------------------------------------------------
  */

  const users =
    dashboard?.users || {};

  const students =
    users?.students || {};

  const parents =
    users?.parents || {};

  const teachers =
    users?.teachers || {};

  const academics =
    dashboard?.academics || {};

  const programs =
    academics?.programs || {};

  const academicSessions =
    academics?.academicSessions || {};

  const classes =
    academics?.classes || {};

  const sections =
    academics?.sections || {};

  const subjects =
    academics?.subjects || {};

  const schedules =
    academics?.schedules || {};

  const admissions =
    dashboard?.admissions || {};

  const enrollments =
    dashboard?.enrollments || {};

  const memberships =
    dashboard?.memberships || {};

  const fees =
    dashboard?.fees || {};

  const feeAssignments =
    fees?.assignments || {};

  const payments =
    dashboard?.payments || {};

  const attendance =
    dashboard?.attendance || {};

  const renewals =
    dashboard?.renewals || {};

  const queries =
    dashboard?.queries || {};

  const trials =
    dashboard?.trials || {};

  const recentActivity =
    Array.isArray(
      dashboard?.recentActivity
    )
      ? dashboard.recentActivity
      : [];

  /*
  |--------------------------------------------------------------------------
  | TEACHER DATA
  |--------------------------------------------------------------------------
  */

  const teacherAssignments =
    dashboard?.assignments || {};

  /*
  |--------------------------------------------------------------------------
  | Attendance Percentage
  |--------------------------------------------------------------------------
  */

  const attendancePercentage =
    getNumber(
      attendance?.percentage
    );

  /*
  |--------------------------------------------------------------------------
  | Teacher Attendance Percentage
  |--------------------------------------------------------------------------
  */

  const teacherAttendancePercentage =
    getNumber(
      dashboard?.attendance?.percentage
    );

  /*
  |--------------------------------------------------------------------------
  | Teacher Assignment Items
  |--------------------------------------------------------------------------
  */

  const teacherAssignmentItems =
    Array.isArray(
      teacherAssignments?.items
    )
      ? teacherAssignments.items
      : [];

  /*
  |--------------------------------------------------------------------------
  | Teacher Recent Activity
  |--------------------------------------------------------------------------
  */

  const teacherRecentActivity =
    Array.isArray(
      dashboard?.recentActivity
    )
      ? dashboard.recentActivity
      : [];

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="px-5 py-7 lg:px-8 lg:py-9">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />

            <div className="mt-3 h-9 w-48 animate-pulse rounded bg-slate-200" />

            <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="h-11 w-28 animate-pulse rounded-xl bg-slate-200" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-[145px] animate-pulse rounded-2xl bg-slate-100"
              />
            )
          )}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="px-5 py-7 lg:px-8 lg:py-9">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Welcome back
            {user?.firstName
              ? `, ${user.firstName}`
              : ""}
            . Here is your academy overview.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCcw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Error */}
      {/* ------------------------------------------------------------------ */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="text-sm font-semibold">
              Dashboard could not be loaded
            </p>

            <p className="mt-1 text-xs">
              {error}
            </p>
          </div>
        </div>
      )}

      {!dashboard && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No dashboard data available
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Dashboard statistics will appear
            when records are available.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADMIN DASHBOARD */}
      {/* ------------------------------------------------------------------ */}

      {dashboard && isAdmin && (
        <>
          {/* ================================================================ */}
          {/* People */}
          {/* ================================================================ */}

          <SectionHeader
            title="People"
            description="Overview of students, parents and teaching staff."
          />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Students"
              value={getNumber(
                students.total
              )}
              icon={GraduationCap}
              description={`${getNumber(
                students.active
              )} active students`}
              iconClass="bg-blue-50 text-blue-700"
            />

            <StatCard
              title="Parents"
              value={getNumber(
                parents.total
              )}
              icon={Users}
              description={`${getNumber(
                parents.active
              )} active parent accounts`}
              iconClass="bg-violet-50 text-violet-700"
            />

            <StatCard
              title="Teachers"
              value={getNumber(
                teachers.total
              )}
              icon={Dumbbell}
              description={`${getNumber(
                teachers.active
              )} active teachers`}
              iconClass="bg-amber-50 text-amber-700"
            />

            <StatCard
              title="Active Students"
              value={getNumber(
                students.active
              )}
              icon={UserCheck}
              description="Currently active students"
              iconClass="bg-emerald-50 text-emerald-700"
            />
          </div>

          {/* ================================================================ */}
          {/* Academic */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Academic Overview"
              description="Current academic structure and teaching assignments."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Programs"
                value={getNumber(
                  programs.total
                )}
                icon={Layers3}
                description={`${getNumber(
                  programs.active
                )} active programs`}
                iconClass="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Academic Sessions"
                value={getNumber(
                  academicSessions.total
                )}
                icon={CalendarCheck}
                description={`${getNumber(
                  academicSessions.active
                )} active sessions`}
                iconClass="bg-indigo-50 text-indigo-700"
              />

              <StatCard
                title="Classes"
                value={getNumber(
                  classes.total
                )}
                icon={School}
                description={`${getNumber(
                  classes.active
                )} active classes`}
                iconClass="bg-cyan-50 text-cyan-700"
              />

              <StatCard
                title="Sections"
                value={getNumber(
                  sections.total
                )}
                icon={ListChecks}
                description={`${getNumber(
                  sections.active
                )} active sections`}
                iconClass="bg-purple-50 text-purple-700"
              />

              <StatCard
                title="Subjects"
                value={getNumber(
                  subjects.total
                )}
                icon={GraduationCap}
                description={`${getNumber(
                  subjects.active
                )} active subjects`}
                iconClass="bg-pink-50 text-pink-700"
              />

              <StatCard
                title="Teaching Assignments"
                value={getNumber(
                  schedules.total
                )}
                icon={Dumbbell}
                description={`${getNumber(
                  schedules.active
                )} active assignments`}
                iconClass="bg-orange-50 text-orange-700"
              />

              <StatCard
                title="Active Classes"
                value={getNumber(
                  classes.active
                )}
                icon={School}
                description="Currently active classes"
                iconClass="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Active Sections"
                value={getNumber(
                  sections.active
                )}
                icon={ListChecks}
                description="Currently active sections"
                iconClass="bg-teal-50 text-teal-700"
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* Admissions + Enrollments */}
          {/* ================================================================ */}

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div>
              <SectionHeader
                title="Admissions"
                description="Current admission pipeline."
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SummaryRow
                  label="Total Admissions"
                  value={getNumber(
                    admissions.total
                  )}
                />

                <SummaryRow
                  label="Pending"
                  value={getNumber(
                    admissions.pending
                  )}
                  valueClass="text-amber-600"
                />

                <SummaryRow
                  label="Approved"
                  value={getNumber(
                    admissions.approved
                  )}
                  valueClass="text-emerald-600"
                />

                <SummaryRow
                  label="Rejected"
                  value={getNumber(
                    admissions.rejected
                  )}
                  valueClass="text-red-600"
                />

                <SummaryRow
                  label="Cancelled"
                  value={getNumber(
                    admissions.cancelled
                  )}
                  valueClass="text-slate-500"
                />
              </div>
            </div>

            <div>
              <SectionHeader
                title="Enrollments"
                description="Student enrollment status."
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SummaryRow
                  label="Total Enrollments"
                  value={getNumber(
                    enrollments.total
                  )}
                />

                <SummaryRow
                  label="Active"
                  value={getNumber(
                    enrollments.active
                  )}
                  valueClass="text-emerald-600"
                />

                <SummaryRow
                  label="Completed"
                  value={getNumber(
                    enrollments.completed
                  )}
                />

                <SummaryRow
                  label="Transferred"
                  value={getNumber(
                    enrollments.transferred
                  )}
                />

                <SummaryRow
                  label="Withdrawn"
                  value={getNumber(
                    enrollments.withdrawn
                  )}
                  valueClass="text-orange-600"
                />
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Membership */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Memberships"
              description="Current membership lifecycle overview."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Active"
                value={getNumber(
                  memberships.active
                )}
                icon={ShieldCheck}
                description="Currently active memberships"
                iconClass="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Expiring"
                value={getNumber(
                  memberships.expiring
                )}
                icon={Clock3}
                description="Expiring within 30 days"
                iconClass="bg-orange-50 text-orange-700"
              />

              <StatCard
                title="Expiring in 7 Days"
                value={getNumber(
                  memberships.expiring7Days
                )}
                icon={Clock3}
                description="Requires closer attention"
                iconClass="bg-red-50 text-red-700"
              />

              <StatCard
                title="Expired"
                value={getNumber(
                  memberships.expired
                )}
                icon={XCircle}
                description="Already expired memberships"
                iconClass="bg-red-50 text-red-700"
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* Fees & Payments */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Fees & Payments"
              description="Fee assignment and payment overview."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Fee Assignments"
                value={getNumber(
                  feeAssignments.total
                )}
                icon={CreditCard}
                description={`${getNumber(
                  feeAssignments.paid
                )} paid`}
                iconClass="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Due Fees"
                value={getNumber(
                  feeAssignments.due
                )}
                icon={Clock3}
                description="Fees awaiting payment"
                iconClass="bg-yellow-50 text-yellow-700"
              />

              <StatCard
                title="Overdue Fees"
                value={getNumber(
                  feeAssignments.overdue
                )}
                icon={AlertCircle}
                description="Overdue fee assignments"
                iconClass="bg-red-50 text-red-700"
              />

              <StatCard
                title="Successful Payments"
                value={getNumber(
                  payments.successful
                )}
                icon={CircleDollarSign}
                description="Successful payment records"
                iconClass="bg-emerald-50 text-emerald-700"
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Today's Collection
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {formatAmount(
                    payments?.today?.amount
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {getNumber(
                    payments?.today?.count
                  )} successful payment records today
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  This Month Collection
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {formatAmount(
                    payments?.month?.amount
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {getNumber(
                    payments?.month?.count
                  )} successful payment records this month
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Attendance */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Today's Attendance"
              description="Attendance records currently available for today."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Total"
                value={getNumber(
                  attendance.total
                )}
                icon={CalendarCheck}
                description="Marked today"
              />

              <StatCard
                title="Present"
                value={getNumber(
                  attendance.present
                )}
                icon={CheckCircle2}
                description="Present students"
                iconClass="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Absent"
                value={getNumber(
                  attendance.absent
                )}
                icon={XCircle}
                description="Absent students"
                iconClass="bg-red-50 text-red-700"
              />

              <StatCard
                title="Late"
                value={getNumber(
                  attendance.late
                )}
                icon={Clock3}
                description="Late students"
                iconClass="bg-amber-50 text-amber-700"
              />

              <StatCard
                title="Excused"
                value={getNumber(
                  attendance.excused
                )}
                icon={CheckCircle2}
                description="Excused absences"
                iconClass="bg-blue-50 text-blue-700"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Attendance Rate
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Based on today's marked attendance
                  </p>
                </div>

                <p className="text-2xl font-bold text-slate-950">
                  {attendancePercentage}%
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        attendancePercentage
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Operations */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Operations"
              description="Items requiring academy attention."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Pending Payments"
                value={getNumber(
                  payments.pending
                )}
                icon={CreditCard}
                description="Pending payment records"
                iconClass="bg-yellow-50 text-yellow-700"
              />

              <StatCard
                title="Pending Renewals"
                value={getNumber(
                  renewals.pending
                )}
                icon={RefreshCcw}
                description="Renewals requiring attention"
                iconClass="bg-indigo-50 text-indigo-700"
              />

              <StatCard
                title="Open Queries"
                value={getNumber(
                  queries.open
                )}
                icon={MessageSquare}
                description="Unresolved academy queries"
                iconClass="bg-cyan-50 text-cyan-700"
              />

              <StatCard
                title="Pending Trials"
                value={getNumber(
                  trials.pending
                )}
                icon={Activity}
                description="Trial bookings awaiting action"
                iconClass="bg-pink-50 text-pink-700"
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* Renewals / Queries / Trials */}
          {/* ================================================================ */}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-950">
                Renewals
              </h3>

              <div className="mt-3">
                <SummaryRow
                  label="Pending"
                  value={getNumber(
                    renewals.pending
                  )}
                  valueClass="text-amber-600"
                />

                <SummaryRow
                  label="Approved"
                  value={getNumber(
                    renewals.approved
                  )}
                  valueClass="text-blue-600"
                />

                <SummaryRow
                  label="Partial"
                  value={getNumber(
                    renewals.partial
                  )}
                  valueClass="text-orange-600"
                />

                <SummaryRow
                  label="Completed"
                  value={getNumber(
                    renewals.completed
                  )}
                  valueClass="text-emerald-600"
                />

                <SummaryRow
                  label="Cancelled"
                  value={getNumber(
                    renewals.cancelled
                  )}
                  valueClass="text-red-600"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-950">
                Queries
              </h3>

              <div className="mt-3">
                <SummaryRow
                  label="Total"
                  value={getNumber(
                    queries.total
                  )}
                />

                <SummaryRow
                  label="New"
                  value={getNumber(
                    queries.new
                  )}
                  valueClass="text-blue-600"
                />

                <SummaryRow
                  label="Open"
                  value={getNumber(
                    queries.open
                  )}
                  valueClass="text-amber-600"
                />

                <SummaryRow
                  label="In Progress"
                  value={getNumber(
                    queries.inProgress
                  )}
                  valueClass="text-indigo-600"
                />

                <SummaryRow
                  label="Resolved"
                  value={getNumber(
                    queries.resolved
                  )}
                  valueClass="text-emerald-600"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-950">
                Trial Bookings
              </h3>

              <div className="mt-3">
                <SummaryRow
                  label="Pending"
                  value={getNumber(
                    trials.pending
                  )}
                  valueClass="text-amber-600"
                />

                <SummaryRow
                  label="Confirmed"
                  value={getNumber(
                    trials.confirmed
                  )}
                  valueClass="text-blue-600"
                />

                <SummaryRow
                  label="Completed"
                  value={getNumber(
                    trials.completed
                  )}
                  valueClass="text-emerald-600"
                />

                <SummaryRow
                  label="Cancelled"
                  value={getNumber(
                    trials.cancelled
                  )}
                  valueClass="text-red-600"
                />

                <SummaryRow
                  label="Today's Trials"
                  value={getNumber(
                    trials.today
                  )}
                />
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Recent Activity */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Recent Activity"
              description="Latest actions recorded in the CRM."
            />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    No recent activity
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Activity will appear here when
                    actions are recorded.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map(
                    (activity) => {
                      const actor =
                        activity?.userId;

                      return (
                        <div
                          key={
                            activity?._id
                          }
                          className="flex items-start gap-4 p-4"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Activity
                              size={18}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatActivityAction(
                                activity?.action
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatActivityEntity(
                                activity?.entity
                              )}

                              {actor?.firstName
                                ? ` • ${actor.firstName}${
                                    actor?.lastName
                                      ? ` ${actor.lastName}`
                                      : ""
                                  }`
                                : ""}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {activity?.createdAt
                                ? new Date(
                                    activity.createdAt
                                  ).toLocaleString(
                                    "en-IN"
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TEACHER DASHBOARD */}
      {/* ------------------------------------------------------------------ */}

      {dashboard && isTeacher && (
        <>
          {/* ================================================================ */}
          {/* Teacher Overview */}
          {/* ================================================================ */}

          <SectionHeader
            title="Teaching Overview"
            description="Your assigned academic responsibilities."
          />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="My Assignments"
              value={getNumber(
                teacherAssignments.total
              )}
              icon={Dumbbell}
              description="Active teaching assignments"
              iconClass="bg-blue-50 text-blue-700"
            />

            <StatCard
              title="Attendance Marked"
              value={getNumber(
                attendance.total
              )}
              icon={CalendarCheck}
              description="Attendance marked today"
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <StatCard
              title="Present"
              value={getNumber(
                attendance.present
              )}
              icon={CheckCircle2}
              description="Present students"
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <StatCard
              title="Absent"
              value={getNumber(
                attendance.absent
              )}
              icon={XCircle}
              description="Absent students"
              iconClass="bg-red-50 text-red-700"
            />
          </div>

          {/* ================================================================ */}
          {/* Teacher Attendance */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Today's Attendance"
              description="Attendance records marked by you today."
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Total"
                value={getNumber(
                  attendance.total
                )}
                icon={CalendarCheck}
                description="Marked today"
              />

              <StatCard
                title="Present"
                value={getNumber(
                  attendance.present
                )}
                icon={CheckCircle2}
                description="Present"
                iconClass="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Absent"
                value={getNumber(
                  attendance.absent
                )}
                icon={XCircle}
                description="Absent"
                iconClass="bg-red-50 text-red-700"
              />

              <StatCard
                title="Late"
                value={getNumber(
                  attendance.late
                )}
                icon={Clock3}
                description="Late"
                iconClass="bg-amber-50 text-amber-700"
              />

              <StatCard
                title="Excused"
                value={getNumber(
                  attendance.excused
                )}
                icon={CheckCircle2}
                description="Excused"
                iconClass="bg-blue-50 text-blue-700"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Attendance Rate
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Based on today's records
                  </p>
                </div>

                <p className="text-2xl font-bold text-slate-950">
                  {teacherAttendancePercentage}%
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        teacherAttendancePercentage
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* My Assignments */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="My Teaching Assignments"
              description="Classes, sections and subjects assigned to you."
            />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {teacherAssignmentItems.length ===
              0 ? (
                <div className="p-10 text-center">
                  <Dumbbell
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    No teaching assignments
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    You currently have no active
                    teaching assignments.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {teacherAssignmentItems.map(
                    (assignment) => (
                      <div
                        key={
                          assignment?._id
                        }
                        className="p-5"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Program
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {
                                assignment
                                  ?.program
                                  ?.name
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Academic Session
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {
                                assignment
                                  ?.academicSession
                                  ?.name
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Class
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {
                                assignment
                                  ?.class
                                  ?.name
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Section
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {
                                assignment
                                  ?.section
                                  ?.name
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Subject
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {
                                assignment
                                  ?.subject
                                  ?.name
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Room
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {assignment?.room ||
                                "Not assigned"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Status
                            </p>

                            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* Teacher Activity */}
          {/* ================================================================ */}

          <div className="mt-8">
            <SectionHeader
              title="Recent Activity"
              description="Your latest CRM activities."
            />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {teacherRecentActivity.length ===
              0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    No recent activity
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Your recent actions will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {teacherRecentActivity.map(
                    (activity) => (
                      <div
                        key={
                          activity?._id
                        }
                        className="flex items-start gap-4 p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Activity
                            size={18}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatActivityAction(
                              activity?.action
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatActivityEntity(
                              activity?.entity
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {activity?.createdAt
                              ? new Date(
                                  activity.createdAt
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : ""}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;