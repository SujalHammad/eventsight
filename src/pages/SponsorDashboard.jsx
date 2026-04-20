import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createSponsorProfile,
  deleteSponsorProfile,
  fetchBrandTypes,
  getSponsorEvents,
  getSponsorProfile,
  getSponsorCompletedEvents,
  updateSponsorProfile,
} from "@/lib/api";
import { fmtINR, getErrorMessage, resolveMediaUrl } from "@/lib/utils";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const SOCKET_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace("/api", "") || "http://localhost:8080";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const getBrandTypeName = (brandType, brandTypes = []) => {
  if (!brandType) return "";
  if (typeof brandType === "object") return brandType.name || "";
  return brandTypes.find((item) => item?._id === brandType)?.name || "";
};

function StatCard({ label, value, hint, icon }) {
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: "6px",
      padding: "4px",
      background: "rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#fff",
      textAlign: "center"
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="flex items-center justify-center gap-1 mb-3">
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
          <div style={{
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            opacity: 0.9
          }}>{label}</div>
        </div>
        <div className="text-2xl font-black">{value}</div>
        {hint ? <div style={{ opacity: 0.5, fontSize: "0.85rem", marginTop: "-1px" }}>{hint}</div> : null}
      </div>
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        fontSize: "5.5rem",
        opacity: 0.04,
        fontWeight: 900,
        pointerEvents: "none"
      }}>
        {icon}
      </div>
    </div>
  );
}

function EventCard({ event, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="event-card text-left w-full !p-0"
      style={{ overflow: "hidden", display: "block" }}
    >
      <div className="relative">
        <img
          src={resolveMediaUrl(event.thumbnail) || "https://placehold.co/400x200?text=Event"}
          alt={event.eventName}
          className="w-full h-44 object-cover"
        />
        <div className="absolute top-3 right-3">
          <span
            className={cx(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
              (event.status === "completed" || new Date(event.date) < new Date()) ? "bg-indigo-500/80 text-white" : "bg-emerald-500/80 text-white"
            )}
          >
            {event.status || (new Date(event.date) < new Date() ? "completed" : "upcoming")}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="text-xl font-black truncate">{event.eventName}</div>
            <div className="muted text-sm mt-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              {event.location}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <div className="bg-[var(--bg-soft)] px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase text-[var(--text-soft)]">
            ₹{fmtINR(event.ask)}
          </div>
          <div className="bg-[var(--bg-soft)] px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase text-[var(--text-soft)]">
            {event.eventCategory?.name || "Event"}
          </div>
        </div>
      </div>
    </button>
  );
}

function BrandForm({ initial, brandTypes, onClose, onSubmit, submitting }) {
  const defaults = initial || {};
  const [preview, setPreview] = useState(defaults.logo || null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card animate-fade-up">
        <div className="modal-header">
          <div>
            <h3 className="text-3xl font-black">{defaults.brandName ? "Edit Brand Profile" : "Create Brand Profile"}</h3>
            <p className="muted mt-1">Define your brand identity to unlock AI event analysis.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
          <div className="modal-section-grid">
            <div>
              <label className="field-label">Brand name</label>
              <input name="brandName" defaultValue={defaults.brandName || ""} required className="input-field" placeholder="e.g. Red Bull" />
            </div>
            <div>
              <label className="field-label">Brand type</label>
              <select
                name="brandType"
                defaultValue={typeof defaults.brandType === "object" ? defaults.brandType?._id || "" : defaults.brandType || ""}
                required
                className="select-field"
              >
                <option value="">Select brand type</option>
                {brandTypes.map((type) => (
                  <option key={type._id} value={type._id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-section-grid">
            <div>
              <label className="field-label">Primary KPI</label>
              <select name="brandKpi" defaultValue={defaults.brandKpi || "awareness"} className="select-field">
                <option value="awareness">Brand awareness</option>
                <option value="leads">Lead generation</option>
                <option value="sales">Direct sales</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="field-label">City focus</label>
              <select name="cityFocus" defaultValue={defaults.cityFocus || "all_mp"} className="select-field">
                <option value="all_mp">All MP</option>
                <option value="metro">Metro cities</option>
                <option value="tier2">Tier 2 cities</option>
                <option value="pilgrimage">Pilgrimage sites</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Brand description</label>
            <textarea name="description" defaultValue={defaults.description || ""} rows={4} required className="textarea-field" placeholder="Describe your brand's target audience and goals..." />
          </div>

          <div>
            <label className="field-label">Logo</label>
            <div className="flex gap-4 items-center">
               <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border">
                  {preview ? (
                    <img src={preview} className="w-full h-full object-cover" />
                  ) : <span className="text-[10px] muted">No logo</span>}
               </div>
               <input name="logo" type="file" accept="image/*" onChange={handleFile} className="input-field flex-1" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Saving..." : defaults.brandName ? "Save changes" : "Create profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SponsorDashboard({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [brandTypes, setBrandTypes] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState(null);
  const [submittingBrand, setSubmittingBrand] = useState(false);

  // Filters
  const [fCity, setFCity] = useState("All Cities");
  const [fCat, setFCat] = useState("All Categories");
  const [fStatus, setFStatus] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Use .catch(() => null) for getSponsorProfile so it doesn't crash the whole page if 404 (first time user)
      const [profRes, evtsRes, compRes, typesRes] = await Promise.all([
        getSponsorProfile().catch((err) => {
          if (err.response?.status !== 404) console.error("Profile fetch error:", err);
          return null;
        }),
        getSponsorEvents({ page: 1, limit: 100 }).catch(() => null),
        getSponsorCompletedEvents({ page: 1, limit: 100 }).catch(() => null),
        fetchBrandTypes().catch(() => []),
      ]);

      setProfile(profRes?.data || null);

      const upcoming = evtsRes?.data?.events || evtsRes?.data || [];
      const completed = compRes?.data?.events || compRes?.data || [];
      setEvents([...upcoming, ...completed]);

      setBrandTypes(Array.isArray(typesRes) ? typesRes : (typesRes?.data || []));
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBrand(true);
    const rawForm = e.currentTarget;
    const form = new FormData(rawForm);
    form.append("_v", Date.now()); // Ensure body is never empty
    try {
      if (profile) {
        await updateSponsorProfile(form);
        toast.success("Profile updated");
      } else {
        await createSponsorProfile(form);
        toast.success("Profile created");
      }
      setMode(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmittingBrand(false);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchSearch =
        !search ||
        evt.eventName?.toLowerCase().includes(search.toLowerCase()) ||
        evt.location?.toLowerCase().includes(search.toLowerCase()) ||
        evt.eventCategory?.name?.toLowerCase().includes(search.toLowerCase());

        const matchCity = fCity === "All Cities" || evt.location === fCity;
        const matchCat = fCat === "All Categories" || evt.eventCategory?.name === fCat;
        const status = evt.status || (new Date(evt.date) < new Date() ? "completed" : "upcoming");
        const matchStatus = !fStatus || status === fStatus;

        return matchSearch && matchCity && matchCat && matchStatus;
    });
  }, [events, search, fCity, fCat, fStatus]);

  const cities = useMemo(() => ["All Cities", ...new Set(events.map((e) => e.location))].filter(Boolean), [events]);
  const categories = useMemo(
    () => ["All Categories", ...new Set(events.map((e) => e.eventCategory?.name))].filter(Boolean),
    [events]
  );

  const stats = {
    available: events.filter((e) => (e.status || (new Date(e.date) >= new Date() ? "upcoming" : "")) === "upcoming").length,
    completed: events.filter((e) => (e.status || (new Date(e.date) < new Date() ? "completed" : "")) === "completed").length,
    profile: profile ? "Ready" : "Missing",
  };

  if (loading) return <div className="text-center py-20 muted">Loading dashboard data...</div>;

  return (
    <div className="space-y-6">
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

        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div>
            <div className="section-kicker !text-white/60 mb-3">Sponsor ecosystem</div>
            <h1 className="section-title !text-white !text-[clamp(2.4rem,5vw,2.2rem)] mb-4">
              Welcome, {user?.username || "Sponsor"}
            </h1>
            <p className="text-white/80 text-lg leading-8 max-w-2xl font-small">
              Your command center for discovering high-fit events, running AI-backed ROI predictions, and managing sponsorship pipelines.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-20 mt-10 relative z-10">
          <StatCard label="Live opportunities" value={stats.available} icon="🎯" />
          <StatCard label="Analyzed deals" value={stats.completed} icon="📊" />
          <StatCard
            label="Profile readiness"
            value={stats.profile === "Ready" ? "100%" : "0%"}
            icon="💎"
          />
        </div>
      </section>

      {/* Brand Profile section */}
      <section className="surface-card">
        {profile ? (
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="flex gap-5 items-start min-w-0">
              <img
                src={resolveMediaUrl(profile.logo) || "https://placehold.co/120x120?text=Brand"}
                alt={profile.brandName}
                className="w-28 h-28 rounded-3xl object-cover flex-shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="text-4xl font-black mb-3 tracking-tight">{profile.brandName}</div>
                <p className="text-gray-500 leading-7 max-w-2xl text-[0.95rem]">{profile.description}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-indigo-100">
                    {getBrandTypeName(profile.brandType, brandTypes) || "Industry"}
                  </span>
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-slate-100">{profile.brandKpi}</span>
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-slate-100">{profile.cityFocus}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setMode("edit")}>Edit profile</button>
              <button className="btn-danger" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#dc2626" }} onClick={async () => {
                if (window.confirm("Delete brand profile?")) {
                  try { await deleteSponsorProfile(); loadData(); } catch (err) { toast.error(getErrorMessage(err)); }
                }
              }}>Delete profile</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">📢</div>
            <h3 className="text-2xl font-black mb-2">Create your brand profile</h3>
            <p className="muted mb-6">Complete your profile to unlock high-fit AI event analysis and predictions.</p>
            <button className="btn-primary" onClick={() => setMode("create")}>Get started</button>
          </div>
        )}
      </section>

      {/* Events section */}
      <section className="space-y-6">
        <div className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Events board</div>
              <h2 className="section-title">Browse opportunities</h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, city, or category"
                  className="input-field !pl-10 min-w-[320px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
              </div>
              <button className="btn-secondary" onClick={loadData}>Refresh events</button>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3 mt-6">
            <select className="select-field !w-auto !py-2" value={fCity} onChange={(e) => setFCity(e.target.value)}>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select-field !w-auto !py-2" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="tab-row !mt-0 !flex-shrink-0">
              {[["", "All"], ["upcoming", "Upcoming"], ["completed", "Completed"]].map(([id, label]) => (
                <button key={id} className={cx("tab-pill", fStatus === id && "active")} onClick={() => setFStatus(id)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-up">
          {filteredEvents.map((evt) => (
            <EventCard
              key={evt._id}
              event={evt}
              onClick={() => navigate(`/sponsor/event/${evt._id}`)}
            />
          ))}
        </div>

        {!filteredEvents.length && search && (
          <div className="surface-card text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-black mb-2">No events found matching "{search}"</h3>
            <p className="muted">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </section>

      {mode && (
        <BrandForm
          initial={mode === "edit" ? profile : null}
          brandTypes={brandTypes}
          onClose={() => setMode(null)}
          onSubmit={handleBrandSubmit}
          submitting={submittingBrand}
        />
      )}
    </div>
  );
}