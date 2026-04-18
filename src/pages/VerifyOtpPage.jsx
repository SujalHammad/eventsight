import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { resendOtp, verifyOtp } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const emailPrefill = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") || "").trim(),
      otp: String(form.get("otp") || "").trim(),
    };
    try {
      await verifyOtp(payload);
      toast.success("Email verified successfully");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendOtp({ email: emailPrefill });
      toast.success("OTP resent");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setResending(false);
  };

  return (
    <AppShell user={null}>
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="hero-panel w-full max-w-lg">
          <div className="section-kicker mb-3">Email verification</div>
          <h1 className="section-title mb-2">Verify your account</h1>
          <p className="section-subtitle mb-8">Enter the OTP sent to your email to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input name="email" defaultValue={emailPrefill} className="input-field" type="email" required />
            </div>
            <div>
              <label className="field-label">OTP</label>
              <input name="otp" className="input-field" required placeholder="6-digit code" />
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</button>
          </form>
          <div className="flex items-center justify-between mt-6 text-sm">
            <Link to="/" className="font-bold text-[var(--accent)]">← Back to sign in</Link>
            {emailPrefill ? (
              <button type="button" onClick={handleResend} className="font-bold text-[var(--accent)]" disabled={resending}>
                {resending ? "Resending..." : "Resend OTP"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
