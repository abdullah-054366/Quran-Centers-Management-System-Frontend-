import { Route, Routes, Navigate } from "react-router";

// Pages
import StudentPage from "./pages/studentPages/StudentPage.jsx";
import NotFoundPage from "./pages/404.jsx";
import CentersPage from "./pages/Centers.jsx";
import GroupsPage from "./pages/Groups.jsx";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
//Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Student from "./pages/dashboard/Students.jsx";
import Teachers from "./pages/dashboard/Teachers.jsx";
import StudentProfile from "./pages/dashboard/StudentProfile.jsx";
import Attendance from "./pages/dashboard/Attendance.jsx";
import AttendanceRegistration from "./pages/dashboard/AttendanceRegistration.jsx";
import MemorizationReview from "./pages/dashboard/MemorizationReview.jsx";
import Plans from "./pages/dashboard/Pans.jsx";
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
          <Route path="/student" element={<StudentPage />} />
          <Route path="/centers" element={<CentersPage />} />
          <Route
            path="/groups"
            element={
              <RequireRole allowedRoles={["Admin", "CenterAdmin"]}>
                <GroupsPage />
              </RequireRole>
            }
          />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/students" element={<Student />} />
          <Route
            path="/teachers"
            element={
              <RequireRole allowedRoles={["Admin", "CenterAdmin"]}>
                <Teachers />
              </RequireRole>
            }
          />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/memorization" element={<MemorizationReview />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/attendance/register" element={<AttendanceRegistration />} />
          <Route path="/plans"element={<Plans />}/>
          <Route path="*" element={<Navigate to="/404" replace />} />

        </Route>

          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      </Routes>
    </>
  );
}

export default App;


