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
      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-6 items-stretch min-h-[calc(100vh-140px)]">
        <section className="hero-panel flex flex-col justify-between">
          <div>
            <div className="section-kicker mb-6">Join EventSight</div>
            <h1 className="section-title !text-[clamp(2.3rem,5vw,4.4rem)] max-w-3xl mb-6">
              Create a polished workspace for event sponsors and organizers.
            </h1>
            <p className="section-subtitle text-lg max-w-2xl leading-8">
              Pick your role, verify your email, and start using one clean product instead of scattered tools and spreadsheets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {ROLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id)}
                className={item.id === role ? "soft-card text-left ring-2 ring-[var(--accent)]" : "soft-card text-left"}
              >
                <div className="font-extrabold text-lg mb-2">{item.title}</div>
                <div className="muted text-sm">{item.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="hero-panel flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="section-kicker mb-3">Create account</div>
            <h2 className="section-title mb-2">Register as {role === "sponsor" ? "Sponsor" : "Organizer"}</h2>
            <p className="section-subtitle mb-8">We will send an OTP to verify your email.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Username</label>
                <input name="username" className="input-field" required placeholder="choose a username" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input name="email" type="email" className="input-field" required placeholder="you@example.com" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input name="password" type="password" className="input-field" required placeholder="••••••••" />
              </div>
              <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
            </form>
            <div className="mt-6 text-sm">
              <Link to="/" className="font-bold text-[var(--accent)]">← Back to sign in</Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
