import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthGate from "./pages/AuthGate";
import DashboardSwitch from "./pages/DashboardSwitch";
import RegisterPage from "./pages/RegisterPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import SponsorWisePage from "./pages/SponsorWisePage";
import SponsorEventPage from "./pages/SponsorEventPage";
import SponsorAnalysisPage from "./pages/SponsorAnalysisPage";
import OrganizerEventPage from "./pages/OrganizerEventPage";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(20, 20, 22, 0.8)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600'
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } }
        }}
      />
      <Routes>
        <Route path="/" element={<AuthGate />}>
          <Route index element={<DashboardSwitch />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="sponsor-wise" element={<SponsorWisePage />} />
          <Route path="sponsor/event/:id" element={<SponsorEventPage />} />
          <Route path="sponsor/analysis/:id" element={<SponsorAnalysisPage />} />
          <Route path="organizer/event/:id" element={<OrganizerEventPage />} />
        </Route>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
