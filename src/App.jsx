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
import Attendance from "./pages/dashboard/Attendance.jsx";
import MemorizationReview from "./pages/dashboard/MemorizationReview.jsx";
import Plans from "./pages/dashboard/Pans.jsx";
//Layout
import MainLayout from "./layouts/MainLayout.jsx";
//routes
import RequireRole from "./routes/RequireRole.jsx";


function App() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/centers" element={<CentersPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/students" element={<Student />} />
          <Route path="/memorization" element={<MemorizationReview />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/plans"element={<Plans />}/>
          <Route path="*" element={<Navigate to="/404" replace />} />

        </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register/>} />

      </Routes>
    </>
  );
}

export default App;
