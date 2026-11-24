import { Route, Routes, Navigate } from "react-router";

// Pages
import StudentHome from "./pages/dashboard/StudentHome.jsx";
import NotFoundPage from "./pages/404.jsx";
import CentersPage from "./pages/Centers.jsx";
import HalaqatPage from "./pages/Halaqa.jsx";
import CenterDetails from "./pages/CenterDetails.jsx";
import Users from "./pages/Users.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import SettingsPage from "./pages/Settings.jsx";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
//Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Students from "./pages/dashboard/Students.jsx";
import Teachers from "./pages/dashboard/Teachers.jsx";
import StudentProfile from "./pages/dashboard/StudentProfile.jsx";
import AttendanceRegistration from "./pages/dashboard/AttendanceRegistration.jsx";
import MemorizationReview from "./pages/dashboard/MemorizationReview.jsx";
import Plans from "./pages/dashboard/Plans.jsx";
import PlanSchedule from "./pages/dashboard/PlanSchedule.jsx";
import StudentRecord from "./pages/dashboard/StudentRecord.jsx";
//Layout
import MainLayout from "./layouts/MainLayout.jsx";
import RequireAuth, { GuestOnly } from "./routes/RequireAuth.jsx";
import RequireRole from "./routes/RequireRole.jsx";

function App() {
  return (
    <>
      <Routes>
        <Route
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/student"
            element={
              <RequireRole allowedRoles={["Student"]}>
                <StudentHome />
              </RequireRole>
            }
          />

          <Route path="/student-record" element={<StudentRecord />} />
          <Route
            path="/student-record/:studentId"
            element={<StudentRecord />}
          />

          <Route
            path="/centers"
            element={
              <RequireRole allowedRoles={["PlatformAdmin", "Admin"]}>
                <CentersPage />
              </RequireRole>
            }
          />
          <Route
            path="/centers/:centerId"
            element={
              <RequireRole allowedRoles={["PlatformAdmin", "Admin"]}>
                <CenterDetails />
              </RequireRole>
            }
          />
          <Route
            path="/users"
            element={
              <RequireRole allowedRoles={["PlatformAdmin", "Admin"]}>
                <Users />
              </RequireRole>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/audit"
            element={
              <RequireRole allowedRoles={["PlatformAdmin", "Admin"]}>
                <AuditLog />
              </RequireRole>
            }
          />
          <Route
            path="/groups"
            element={
              <RequireRole
                allowedRoles={["PlatformAdmin", "Admin", "CenterAdmin", "Teacher"]}
              >
                <HalaqatPage />
              </RequireRole>
            }
          />
          <Route path="/404" element={<NotFoundPage />} />
          <Route
            path="/students"
            element={
              <RequireRole
                allowedRoles={[
                  "PlatformAdmin",
                  "Admin",
                  "CenterAdmin",
                  "Teacher",
                ]}
              >
                <Students />
              </RequireRole>
            }
          />
          <Route
            path="/teachers"
            element={
              <RequireRole
                allowedRoles={["PlatformAdmin", "Admin", "CenterAdmin"]}
              >
                <Teachers />
              </RequireRole>
            }
          />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route
            path="/memorization"
            element={
              <RequireRole allowedRoles={["Teacher"]}>
                <MemorizationReview />
              </RequireRole>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequireRole
                allowedRoles={[
                  "PlatformAdmin",
                  "Admin",
                  "CenterAdmin",
                  "Teacher",
                ]}
              >
                <AttendanceRegistration />
              </RequireRole>
            }
          />
          <Route
            path="/plans"
            element={
              <RequireRole
                allowedRoles={[
                  "PlatformAdmin",
                  "Admin",
                  "CenterAdmin",
                  "Teacher",
                  "Student",
                ]}
              >
                <Plans />
              </RequireRole>
            }
          />
          <Route
            path="/plans/:planId"
            element={
              <RequireRole
                allowedRoles={[
                  "PlatformAdmin",
                  "Admin",
                  "CenterAdmin",
                  "Teacher",
                  "Student",
                ]}
              >
                <PlanSchedule />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>

        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
      </Routes>
    </>
  );
}

export default App;
