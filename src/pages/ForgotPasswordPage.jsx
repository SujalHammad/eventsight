import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { forgetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    try {
      await forgetPassword({ email });
      toast.success("OTP sent to your email");
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  return (
    <AppShell user={null}>
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="hero-panel w-full max-w-lg">
          <div className="section-kicker mb-3">Password reset</div>
          <h1 className="section-title mb-2">Forgot your password?</h1>
          <p className="section-subtitle mb-8">Enter your email and we will send you an OTP to reset it.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input name="email" type="email" required className="input-field" placeholder="you@example.com" />
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending..." : "Send reset OTP"}</button>
          </form>
          <div className="mt-6 text-sm">
            <Link to="/" className="font-bold text-[var(--accent)]">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
