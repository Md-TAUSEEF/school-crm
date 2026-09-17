import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import CRMLayout from "./components/layout/CRMLayout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Students from "./pages/students/Students";
import Parents from "./pages/Parents/Parents";
import Teachers from "./pages/teachers/Teachers";
import Classes from "./pages/Classes/Classes";
import Schedules from "./pages/Schedules/Schedules";
import Attendance from "./pages/Attendance/Attendance";
import Progress from "./pages/Progress/Progress";
import Memberships from "./pages/Memberships";
import Queries from "./pages/Queries/Queries";
import Renewals from "./pages/Renewals/Renewals";
import Payments from "./pages/Payments/Payments";
import FeeStructures from "./pages/FeeStructures/FeeStructures";
import FeeAssignments from "./pages/FeeAssignments/FeeAssignments";
import Admissions from "./pages/Admissions";
import Enrollments from "./pages/Enrollments";
import Program from "./pages/Programs/Programs";
import AcademicSessions from "./pages/AcademicSessions/AcademicSessions";
import Sections from "./pages/Sections/Sections"
import Subject from "./pages/Subject"
import Notification from "./pages/Notification"
const ModulePlaceholder = ({ title }) => {
  return (
    <div className="px-5 py-10 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>

        <p className="mt-2 text-sm text-slate-500">
          This module will be connected to the real Force Strike backend data
          next.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          No demo or fake data is being displayed.
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected CRM */}
          <Route element={<ProtectedRoute />}>
            <Route element={<CRMLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin Routes */}
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="/students" element={<Students />} />

                <Route path="/parents" element={<Parents />} />

                <Route path="/teachers" element={<Teachers />} />

                <Route path="/classes" element={<Classes />} />
                <Route path="/programs" element={<Program />} />
                 <Route path="/sections" element={<Sections />} />
                <Route
                  path="/academic-sessions"
                  element={<AcademicSessions />}
                />
                <Route path="/subjects" element={<Subject/>}/>

                <Route path="/schedules" element={<Schedules />} />

                <Route path="/attendance" element={<Attendance />} />

                <Route
                  element={<RoleRoute allowedRoles={["admin", "teacher"]} />}
                >
                  <Route path="/progress" element={<Progress />} />
                </Route>

    

                <Route path="/fee-structures" element={<FeeStructures />} />

                <Route path="/fee-assignments" element={<FeeAssignments />} />

                <Route path="/payments" element={<Payments />} />

                <Route path="/memberships" element={<Memberships />} />

                <Route path="/renewals" element={<Renewals />} />

                <Route path="/queries" element={<Queries />} />

                <Route path="/admissions" element={<Admissions />} />
                <Route path="/enrollments" element={<Enrollments />} />
                <Route
                  path="/trials"
                  element={<ModulePlaceholder title="Trial Bookings" />}
                />

               <Route path="/notifications" element={<Queries />} />

                <Route
                  path="/audit-logs"
                  element={<ModulePlaceholder title="Audit Logs" />}
                />
              </Route>
            </Route>

            {/* Protected fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Public fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
