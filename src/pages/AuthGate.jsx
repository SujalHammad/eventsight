import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUser, login } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: "🎯", title: "Brand-event fit", desc: "AI-assisted matching for sponsors and organizers." },
  { icon: "⚡", title: "Fast verdicts", desc: "Get a usable recommendation in seconds." },
  { icon: "📊", title: "Clean pipeline", desc: "Track events, feedback, and ROI in one workspace." },
];

export default function AuthGate() {
  const { user, setUser, setRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCurrentUser();
        const current = res?.data?.user ?? res?.user ?? res?.data;
        if (current) { setUser(current); setRole(current.role); }
      } catch { }
      setLoading(false);
    })();
  }, [setRole, setUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await login({
        username: String(form.get("username") || "").trim(),
        password: String(form.get("password") || "").trim(),
      });
      const current = res?.data?.user ?? res?.user ?? res?.data;
      setUser(current);
      setRole(current?.role);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <AppShell user={null}>
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="surface-card text-center" style={{ maxWidth: "300px", width: "100%" }}>
            <div className="w-9 h-9 mx-auto rounded-full border-4 border-[var(--line)] border-t-[var(--accent)] animate-spin mb-3" />
            <p className="font-semibold text-sm">Checking session…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (user) {
    return (
      <AppShell user={user}>
        <Outlet />
      </AppShell>
    );
  }

  return (
    <AppShell user={null}>
      {/* Full-height centering wrapper */}
      <div style={{ minHeight: "calc(100vh - 110px)", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Constrained centered grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", width: "100%", maxWidth: "1100px", height: "640px" }}>

          {/* ─── LEFT: Hero / Marketing ─── */}
          <div style={{
            background: "linear-gradient(140deg, #6d5efc 0%, #4338ca 55%, #1e1b4b 100%)",
            borderRadius: "20px",
            padding: "40px 36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#fff",
            overflow: "hidden",
          }}>
            {/* Top content */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.6, marginBottom: "12px" }}>
                SponsorWise · AI Sponsorship Platform
              </p>
              <h1 style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.3, marginBottom: "16px", color: "#fff" }}>
                A cleaner event sponsorship experience.
              </h1>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.65, opacity: 0.75, marginBottom: "32px", maxWidth: "360px" }}>
                Connect sponsors with high-fit events using AI-backed predictions and real-time feedback loops.
              </p>

              {/* Feature boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "32px" }}>
                {FEATURES.map(({ icon, title, desc }) => (
                  <div key={title} style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <div style={{ fontSize: "1.2rem", marginBottom: "8px" }}>{icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: "6px" }}>{title}</div>
                    <div style={{ fontSize: "0.72rem", opacity: 0.7, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom stats */}
            <div style={{ display: "flex", gap: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              {[["500+", "Events"], ["AI", "Predictions"], ["Fast", "Onboarding"]].map(([val, label]) => (
                <div key={val}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: "0.63rem", opacity: 0.6, marginTop: "2px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Login Card ─── */}
          <div style={{
            background: "var(--surface)",
            borderRadius: "20px",
            boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
            padding: "40px 38px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "12px" }}>
              Welcome back
            </p>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", lineHeight: 1.25, marginBottom: "8px" }}>
              Sign in to SponsorWise
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", lineHeight: 1.6, marginBottom: "32px" }}>
              Access your sponsor or organizer dashboard.
            </p>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "5px" }}>
                  Username
                </label>
                <input
                  name="username"
                  className="input-field"
                  style={{ padding: "14px 16px", fontSize: "0.95rem", borderRadius: "12px" }}
                  placeholder="your username"
                  autoComplete="username"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "5px" }}>
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  className="input-field"
                  style={{ padding: "14px 16px", fontSize: "0.95rem", borderRadius: "12px" }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: "100%", padding: "13px", fontSize: "0.95rem", fontWeight: 700, marginTop: "8px", borderRadius: "12px" }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--line)", fontSize: "0.85rem" }}>
              <Link to="/register" style={{ fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                Create account →
              </Link>
              <Link to="/forgot-password" style={{ color: "var(--text-soft)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
