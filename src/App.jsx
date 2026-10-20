import { Route, Routes , Navigate } from "react-router";

// Pages
import StudentPage from "./pages/studentPages/StudentPage.jsx";
import NotFoundPage from "./pages/404.jsx";
import CentersPage from "./pages/Centers.jsx";
import GroupsPage from "./pages/Groups.jsx";
//Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
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
          <Route path="*" element={<Navigate to="/404" replace />} /> 
        </Route>
      </Routes>
    </>
  );
}

export default App;
