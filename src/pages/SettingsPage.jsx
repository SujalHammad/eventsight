import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { changePassword, updateProfile, deleteAccount, logout } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

function SettingsCard({ kicker, title, description, children, danger = false }) {
  return (
    <section className={danger ? "settings-card danger-surface" : "settings-card"}>
      <div className="space-y-2 mb-6">
        <div className="section-kicker">{kicker}</div>
        <h2 className="text-2xl font-black">{title}</h2>
        {description ? <p className="section-subtitle max-w-2xl">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function InlineMessage({ type = "success", children }) {
  if (!children) return null;
  return <div className={`inline-message ${type}`}>{children}</div>;
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
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setLoading((prev) => ({ ...prev, password: true }));
    try {
      await changePassword({ oldPassword, newPassword, confirmPassword });
      setPasswordSuccess("Password changed. Please sign in again.");
      await logout();
      setUser(null);
      setRole(null);
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type DELETE to confirm account removal.');
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
    <div className="space-y-6">
      <section className="hero-panel settings-hero">
        <div className="space-y-3">
          <div className="section-kicker">Account settings</div>
          <h1 className="section-title !text-[clamp(2.3rem,5vw,4.4rem)]">Manage your account</h1>
          <p className="section-subtitle text-lg leading-8 max-w-3xl">
            Update your profile, change your password, and manage account security from one clean workspace.
          </p>
        </div>
        <div className="settings-hero-chip-row">
          <div className="settings-hero-chip">
            <span className="field-label !mb-1">Signed in as</span>
            <div className="text-lg font-black">@{user?.username || "user"}</div>
          </div>
          <div className="settings-hero-chip">
            <span className="field-label !mb-1">Role</span>
            <div className="text-lg font-black capitalize">{user?.role || "account"}</div>
          </div>
        </div>
      </section>

      <div className="settings-grid">
        <SettingsCard
          kicker="Profile"
          title="Update profile"
          description="Keep your name and email current so your dashboard and event workspace stay accurate."
        >
          <form onSubmit={handleUpdateProfile} className="settings-form-grid">
            <div>
              <label className="field-label">Username</label>
              <input className="input-field" name="username" defaultValue={user?.username || ""} placeholder="Username" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="input-field" type="email" name="email" defaultValue={user?.email || ""} placeholder="Email address" />
            </div>
            <div className="settings-actions md:col-span-2">
              <button className="btn-primary" disabled={loading.profile}>
                {loading.profile ? "Saving..." : "Save changes"}
              </button>
            </div>
            <div className="md:col-span-2 space-y-3">
              <InlineMessage type="error">{profileError}</InlineMessage>
              <InlineMessage type="success">{profileSuccess}</InlineMessage>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard
          kicker="Security"
          title="Change password"
          description="Use a strong password and rotate it whenever your account credentials need refreshing."
        >
          <form onSubmit={handleChangePassword} className="settings-form-grid">
            <div className="md:col-span-2">
              <label className="field-label">Current password</label>
              <input className="input-field" type="password" name="oldPassword" placeholder="Current password" />
            </div>
            <div>
              <label className="field-label">New password</label>
              <input className="input-field" type="password" name="newPassword" placeholder="New password" />
            </div>
            <div>
              <label className="field-label">Confirm new password</label>
              <input className="input-field" type="password" name="confirmPassword" placeholder="Confirm password" />
            </div>
            <div className="settings-actions md:col-span-2">
              <button className="btn-primary" disabled={loading.password}>
                {loading.password ? "Updating..." : "Change password"}
              </button>
            </div>
            <div className="md:col-span-2 space-y-3">
              <InlineMessage type="error">{passwordError}</InlineMessage>
              <InlineMessage type="success">{passwordSuccess}</InlineMessage>
            </div>
          </form>
        </SettingsCard>
      </div>

      <SettingsCard
        kicker="Danger zone"
        title="Delete account"
        description="This permanently removes your account and cannot be undone."
        danger
      >
        <div className="danger-panel">
          <div className="space-y-2">
            <div className="font-black text-lg">Confirm destructive action</div>
            <p className="section-subtitle max-w-2xl">Type DELETE exactly to remove your account, profile, and related workspace data.</p>
          </div>
          <div className="danger-controls">
            <input
              className="input-field"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
            />
            <button className="btn-danger" onClick={handleDelete} disabled={loading.delete}>
              {loading.delete ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <InlineMessage type="error">{deleteError}</InlineMessage>
        </div>
      </SettingsCard>
    </div>
  );
}
