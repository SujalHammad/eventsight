import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUser, login } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

const FEATURES = [
  ["Brand-event fit", "AI-assisted matching for sponsors and organizers."],
  ["Fast sponsorship verdicts", "Run a prediction and get a usable recommendation instantly."],
  ["Cleaner event pipeline", "Track events, feedback, and ROI signals in one workspace."],
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
        if (current) {
          setUser(current);
          setRole(current.role);
        }
      } catch {}
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
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="surface-card text-center max-w-sm w-full">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-[var(--line)] border-t-[var(--accent)] animate-spin mb-4" />
            <div className="font-bold">Checking session...</div>
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
      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6 items-stretch min-h-[calc(100vh-140px)]">
        <section className="hero-panel flex flex-col justify-between">
          <div>
            <div className="section-kicker mb-6">Smarter sponsorship platform</div>
            <h1 className="section-title !text-[clamp(2.6rem,6vw,5rem)] max-w-3xl mb-6">
              A cleaner event sponsorship experience your users will actually enjoy.
            </h1>
            <p className="section-subtitle text-lg max-w-2xl leading-8 mb-10">
              EventSight helps sponsors discover promising events, organizers present stronger opportunities, and both sides make better decisions with AI-backed prediction and feedback loops.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {FEATURES.map(([title, desc]) => (
                <div key={title} className="soft-card">
                  <div className="font-extrabold text-lg mb-2">{title}</div>
                  <div className="muted text-sm leading-6">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <div>
              <div className="text-3xl font-black">500+</div>
              <div className="faint text-sm">Events evaluated</div>
            </div>
            <div>
              <div className="text-3xl font-black">ROI</div>
              <div className="faint text-sm">Prediction-backed decisions</div>
            </div>
            <div>
              <div className="text-3xl font-black">Fast</div>
              <div className="faint text-sm">Simple onboarding flow</div>
            </div>
          </div>
        </section>

        <section className="hero-panel flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="section-kicker mb-3">Welcome back</div>
            <h2 className="section-title mb-2">Sign in to EventSight</h2>
            <p className="section-subtitle mb-8">Use your account to access sponsor or organizer dashboards.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="field-label">Username</label>
                <input name="username" className="input-field" placeholder="your username" autoComplete="username" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input name="password" type="password" className="input-field" placeholder="••••••••" autoComplete="current-password" />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 text-sm">
              <Link to="/register" className="font-bold text-[var(--accent)]">Create account →</Link>
              <Link to="/forgot-password" className="muted">Forgot password?</Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
