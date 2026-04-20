import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { changePassword, updateProfile, deleteAccount, logout } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

function SettingsSection({ kicker, title, description, children, danger = false }) {
  return (
    <section className={danger ? "settings-card danger-surface" : "settings-card"}>
      <div className="space-y-2 mb-8">
        <div className="section-kicker">{kicker}</div>
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description && <p className="muted text-sm max-w-2xl">{description}</p>}
      </div>
      <div className="animate-fade-up">
        {children}
      </div>
    </section>
  );
}

function InlineMessage({ type = "success", children }) {
  if (!children) return null;
  const isErr = type === "error";
  return (
    <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-bold mt-4 ${
      isErr 
        ? "bg-red-500/10 text-red-600" 
        : "bg-emerald-500/10 text-emerald-600"
    }`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser, setRole } = useAuth();
  const [loading, setLoading] = useState({ profile: false, password: false, delete: false });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    const email = String(form.get("email") || "").trim();
    
    if (!username && !email) {
      setProfileError("Please provide a username or email.");
      return;
    }

    setLoading((prev) => ({ ...prev, profile: true }));
    try {
      await updateProfile({ username: username || undefined, email: email || undefined });
      setProfileSuccess("Profile updated successfully.");
      toast.success("Profile updated");
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    const form = new FormData(e.currentTarget);
    const oldPassword = String(form.get("oldPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setLoading((prev) => ({ ...prev, password: true }));
    try {
      await changePassword({ oldPassword, newPassword, confirmPassword });
      setPasswordSuccess("Password changed. Signing out...");
      setTimeout(async () => {
        await logout();
        setUser(null);
        setRole(null);
      }, 2000);
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      await deleteAccount();
      setUser(null);
      setRole(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="hero-panel" style={{
        background: "linear-gradient(135deg, #6d5efc 0%, #4f46e5 100%)",
        color: "#fff",
        border: "none",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)",
          pointerEvents: "none"
        }} />

        <div className="relative z-10">
          <div className="section-kicker !text-white/60 mb-3">Account preferences</div>
          <h1 className="section-title !text-white !text-[clamp(2.4rem,5vw,4.2rem)] mb-4">
            Workspace Settings
          </h1>
          <p className="text-white/80 text-lg leading-8 max-w-2xl font-medium">
            Manage your account's public identity, security credentials, and data privacy from one centralized dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mt-8 relative z-10">
          <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
            <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-1">Authenticated as</div>
            <div className="text-xl font-black">@{user?.username}</div>
          </div>
          <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[140px]">
            <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-1">Account Role</div>
            <div className="text-xl font-black capitalize">{user?.role}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-8">
        <SettingsSection
          kicker="Identity"
          title="Update Profile"
          description="Update your username and contact email to keep your workspace identity up to date."
        >
          <form onSubmit={handleUpdateProfile} className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <div>
              <label className="field-label">Username</label>
              <input className="input-field" name="username" defaultValue={user?.username || ""} placeholder="New username" />
            </div>
            <div>
              <label className="field-label">Email address</label>
              <input className="input-field" type="email" name="email" defaultValue={user?.email || ""} placeholder="email@example.com" />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary w-full md:w-auto px-8" disabled={loading.profile}>
                {loading.profile ? "Saving..." : "Save changes"}
              </button>
            </div>
            <div className="md:col-span-2">
              <InlineMessage type="error">{profileError}</InlineMessage>
              <InlineMessage type="success">{profileSuccess}</InlineMessage>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          kicker="Security"
          title="Change Password"
          description="Regularly rotate your password to ensure your account remains secure."
        >
          <form onSubmit={handleChangePassword} className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <div className="md:col-span-2">
              <label className="field-label">Current password</label>
              <input className="input-field" type="password" name="oldPassword" placeholder="Enter current password" />
            </div>
            <div>
              <label className="field-label">New password</label>
              <input className="input-field" type="password" name="newPassword" placeholder="Minimum 6 characters" />
            </div>
            <div>
              <label className="field-label">Confirm new password</label>
              <input className="input-field" type="password" name="confirmPassword" placeholder="Repeat new password" />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary w-full md:w-auto px-8" disabled={loading.password}>
                {loading.password ? "Updating..." : "Update password"}
              </button>
            </div>
            <div className="md:col-span-2">
              <InlineMessage type="error">{passwordError}</InlineMessage>
              <InlineMessage type="success">{passwordSuccess}</InlineMessage>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          kicker="Danger Zone"
          title="Delete Account"
          description="Irreversibly remove your account and all associated data from the platform."
          danger
        >
          <div className="space-y-4">
            <p className="text-sm font-bold opacity-70">
              Type <span className="text-red-500 font-black">DELETE</span> below to confirm permanent account removal.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                className="input-field max-w-sm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
              />
              <button className="btn-danger md:w-auto" onClick={handleDelete} disabled={loading.delete}>
                {loading.delete ? "Deleting..." : "Permanently Delete Account"}
              </button>
            </div>
            <InlineMessage type="error">{deleteError}</InlineMessage>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
