import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import type { ReactElement } from "react";
import HomePage from "@/react-app/pages/Home";
import LoginPage from "@/react-app/pages/Login";
import SignupPage from "@/react-app/pages/Signup";
import ForgotPasswordPage from "@/react-app/pages/ForgotPassword";
import AboutPage from "@/react-app/pages/About";
import UserDashboard from "@/react-app/pages/UserDashboard";
import ThreatDetection from "@/react-app/pages/ThreatDetection";
import XAIExplanation from "@/react-app/pages/XAIExplanation";
import Alerts from "@/react-app/pages/Alerts";
import Logs from "@/react-app/pages/Logs";
import AdminDashboard from "@/react-app/pages/AdminDashboard";
import UserManagement from "@/react-app/pages/UserManagement";
import ModelManagement from "@/react-app/pages/ModelManagement";
import Analytics from "@/react-app/pages/Analytics";
import AuditLogs from "@/react-app/pages/AuditLogs";
import RealTimeCapture from "@/react-app/pages/RealTimeCapture";
import AlertConfiguration from "@/react-app/pages/AlertConfiguration";
import UserProfile from "@/react-app/pages/UserProfile";
import AdminSettings from "@/react-app/pages/AdminSettings";
import RiskAssessment from "@/react-app/pages/RiskAssessment";
import IncidentResponse from "@/react-app/pages/IncidentResponse";

export default function App() {
  const RequireAuth = ({ children }: { children: ReactElement }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return children;
  };
  const RequireAdmin = ({ children }: { children: ReactElement }) => {
    const user = localStorage.getItem('user');
    const role = user ? JSON.parse(user).role : null;
    if (role !== 'admin') return <Navigate to="/user/dashboard" replace />;
    return children;
  };
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<RequireAuth><UserDashboard /></RequireAuth>} />
        <Route path="/user/dashboard" element={<RequireAuth><UserDashboard /></RequireAuth>} />
        <Route path="/threats" element={<RequireAuth><ThreatDetection /></RequireAuth>} />
        <Route path="/capture" element={<RequireAuth><RealTimeCapture /></RequireAuth>} />
        <Route path="/incidents" element={<RequireAuth><IncidentResponse /></RequireAuth>} />
        <Route path="/xai" element={<RequireAuth><XAIExplanation /></RequireAuth>} />
        <Route path="/alerts" element={<RequireAuth><Alerts /></RequireAuth>} />
        <Route path="/logs" element={<RequireAuth><Logs /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><UserProfile /></RequireAuth>} />
        <Route path="/admin/dashboard" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth><RequireAdmin><UserManagement /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/models" element={<RequireAuth><RequireAdmin><ModelManagement /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/alert-config" element={<RequireAuth><RequireAdmin><AlertConfiguration /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/risk" element={<RequireAuth><RequireAdmin><RiskAssessment /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/incidents" element={<RequireAuth><RequireAdmin><IncidentResponse /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/analytics" element={<RequireAuth><RequireAdmin><Analytics /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/audit" element={<RequireAuth><RequireAdmin><AuditLogs /></RequireAdmin></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth><RequireAdmin><AdminSettings /></RequireAdmin></RequireAuth>} />
      </Routes>
    </Router>
  );
}
