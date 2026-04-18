import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { resetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") || "").trim(),
      otp: String(form.get("otp") || "").trim(),
      newPassword: String(form.get("newPassword") || "").trim(),
      confirmPassword: String(form.get("confirmPassword") || "").trim(),
    };
    try {
      await resetPassword(payload);
      toast.success("Password reset successful");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  return (
    <AppShell user={null}>
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="hero-panel w-full max-w-lg">
          <div className="section-kicker mb-3">Reset password</div>
          <h1 className="section-title mb-2">Use your OTP to set a new password</h1>
          <p className="section-subtitle mb-8">Keep the OTP and new password ready.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input name="email" defaultValue={location.state?.email || ""} className="input-field" type="email" required />
            </div>
            <div>
              <label className="field-label">OTP</label>
              <input name="otp" className="input-field" required placeholder="6-digit code" />
            </div>
            <div>
              <label className="field-label">New password</label>
              <input name="newPassword" type="password" className="input-field" required />
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <input name="confirmPassword" type="password" className="input-field" required />
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? "Resetting..." : "Reset password"}</button>
          </form>
          <div className="mt-6 text-sm">
            <Link to="/" className="font-bold text-[var(--accent)]">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
