import { Routes, Route, Navigate } from "react-router-dom";
import OrganizationsPage from "./pages/OrganizationsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orgs" />} />
      <Route path="/orgs" element={<OrganizationsPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      <Route path="*" element={<Navigate to="/orgs" />} />
    </Routes>
  );
}
