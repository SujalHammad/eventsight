import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { registerOrganizer, registerSponsor } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

const ROLES = [
  { id: "sponsor", title: "Sponsor", desc: "Discover events and run predictions." },
  { id: "organizer", title: "Organizer", desc: "Create events and manage opportunity quality." },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("sponsor");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      username: String(form.get("username") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "").trim(),
    };
    try {
      if (role === "sponsor") await registerSponsor(payload);
      else await registerOrganizer(payload);
      navigate("/verify-otp", { state: { email: payload.email } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  return (
    <AppShell user={null}>
      {/* Full-height centering wrapper */}
      <div style={{ minHeight: "calc(100vh - 110px)", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Constrained centered grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", width: "100%", maxWidth: "1100px", height: "600px" }}>

          {/* ─── LEFT: Role Selection Hero ─── */}
          <div style={{
            background: "linear-gradient(140deg, #6d5efc 0%, #4338ca 55%, #1e1b4b 100%)",
            borderRadius: "20px",
            padding: "44px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#fff",
            overflow: "hidden",
          }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.6, marginBottom: "12px" }}>
                Join SponsorWise
              </p>
              <h1 style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.25, marginBottom: "16px", color: "#fff" }}>
                Create a polished workspace for event sponsors and organizers.
              </h1>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.65, opacity: 0.75, marginBottom: "32px", maxWidth: "380px" }}>
                Pick your role, verify your email, and start using one clean product instead of scattered tools and spreadsheets.
              </p>

              {/* Role cards selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                {ROLES.map((item) => {
                  const isActive = item.id === role;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      style={{
                        background: isActive ? "#fff" : "rgba(255,255,255,0.08)",
                        color: isActive ? "#4338ca" : "#fff",
                        border: "none",
                        borderRadius: "16px",
                        padding: "24px 18px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: isActive ? "translateY(-4px)" : "none",
                        boxShadow: isActive ? "0 12px 30px rgba(0,0,0,0.15)" : "none",
                        position: "relative",
                        outline: "none",
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: "absolute",
                          top: "14px",
                          right: "14px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "#4338ca",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 900
                        }}>✓</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "8px" }}>{item.title}</div>
                      <div style={{ fontSize: "0.8rem", opacity: isActive ? 0.8 : 0.65, lineHeight: 1.4 }}>{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              {[["Fast", "Verification"], ["Secure", "Access"], ["Free", "Trial"]].map(([val, label]) => (
                <div key={val}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "4px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Register Form ─── */}
          <div style={{
            background: "var(--surface)",
            borderRadius: "20px",
            boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
            padding: "36px 38px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "12px" }}>
              Create account
            </p>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", lineHeight: 1.25, marginBottom: "8px" }}>
              Register as {role === "sponsor" ? "Sponsor" : "Organizer"}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", lineHeight: 1.6, marginBottom: "32px" }}>
              We will send an OTP to verify your email.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "5px" }}>
                  Username
                </label>
                <input
                  name="username"
                  className="input-field"
                  style={{ padding: "14px 16px", fontSize: "0.92rem", borderRadius: "12px" }}
                  placeholder="choose a username"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "5px" }}>
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  className="input-field"
                  style={{ padding: "14px 16px", fontSize: "0.92rem", borderRadius: "12px" }}
                  placeholder="you@example.com"
                  required
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
                  style={{ padding: "14px 16px", fontSize: "0.92rem", borderRadius: "12px" }}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", padding: "13px", fontSize: "0.95rem", fontWeight: 700, marginTop: "8px", borderRadius: "12px" }}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--line)", fontSize: "0.85rem" }}>
              <Link to="/" style={{ fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                ← Back to sign in
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
