import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createSponsorProfile,
  deleteSponsorProfile,
  fetchBrandTypes,
  getEventPrediction,
  getMyEventFeedback,
  getSponsorCompletedEvents,
  getSponsorEventById,
  getSponsorEvents,
  getSponsorProfile,
  giveEventFeedback,
  updateEventFeedback,
  updateSponsorProfile,
} from "@/lib/api";
import { coldEmailToText, fmtINR, getErrorMessage } from "@/lib/utils";
import ResultsPanel from "@/components/results/ResultsPanel";
import ChatBox from "@/components/ChatBox";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace("/api", "") || "http://localhost:8080";

const cx = (...xs) => xs.filter(Boolean).join(" ");

const STATUS_CLASS = {
  upcoming: "status-chip status-upcoming",
  completed: "status-chip status-completed",
  cancelled: "status-chip status-cancelled",
};

const ensureUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw.replace(/^@/, "")}`;
};

const buildSocialUrl = (item = {}) => {
  const direct = item.link || item.url || item.href || "";
  if (direct) return ensureUrl(direct);

  const handle = String(item.handle || item.username || item.account || "").trim().replace(/^@/, "");
  const platform = String(item.platform || item.name || item.type || item.channel || "").toLowerCase();

  if (!handle) return "";

  if (platform.includes("instagram") || platform.includes("insta")) return `https://instagram.com/${handle}`;
  if (platform.includes("facebook")) return `https://facebook.com/${handle}`;
  if (platform.includes("linkedin")) return `https://linkedin.com/in/${handle}`;
  if (platform.includes("twitter") || platform === "x" || platform.includes("x.com")) return `https://x.com/${handle}`;
  if (platform.includes("youtube")) return `https://youtube.com/@${handle}`;

  return `https://${handle}`;
};

const normalizeSocialMedia = (raw = []) => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (typeof item === "string") {
        const href = ensureUrl(item);
        return {
          id: `social-${index}`,
          platform: "Social profile",
          handle: item,
          href,
          followers: "",
        };
      }

      if (!item || typeof item !== "object") return null;

      const platform = item.platform || item.name || item.type || item.channel || "Social profile";
      const handle = item.handle || item.username || item.account || "";
      const followers = item.followers || item.audience || item.reach || "";
      const href = buildSocialUrl(item);

      return {
        id: `social-${index}`,
        platform,
        handle,
        followers,
        href,
      };
    })
    .filter(Boolean);
};

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="field-label">{label}</div>
      <div className="text-4xl font-black">{value}</div>
      {hint ? <div className="faint text-sm mt-2">{hint}</div> : null}
    </div>
  );
}

function SponsorProfileForm({ defaults = {}, brandTypes, onSubmit, submitting }) {
  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="field-label">Brand name</label>
        <input name="brandName" defaultValue={defaults.brandName || ""} required className="input-field" />
      </div>

      <div>
        <label className="field-label">Industry</label>
        <select
          name="brandType"
          defaultValue={defaults.brandType?._id || defaults.brandType || ""}
          required
          className="select-field"
        >
          <option value="">Select brand type</option>
          {brandTypes.map((type) => (
            <option key={type._id} value={type._id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Brand KPI</label>
        <select name="brandKpi" defaultValue={defaults.brandKpi || "awareness"} className="select-field">
          {["awareness", "hybrid", "leads", "sales"].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">City focus</label>
        <select name="cityFocus" defaultValue={defaults.cityFocus || "all_mp"} required className="select-field">
          <option value="all_mp">All MP</option>
          <option value="metro">Metro cities</option>
          <option value="tier2">Tier 2 cities</option>
          <option value="pilgrimage">Pilgrimage sites</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="field-label">Brand description</label>
        <textarea
          name="description"
          defaultValue={defaults.description || ""}
          rows={4}
          required
          className="textarea-field"
        />
      </div>

      <div className="md:col-span-2">
        <label className="field-label">Logo</label>
        <input
          name="logo"
          type="file"
          accept="image/*"
          className="input-field file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-white file:font-bold"
        />
      </div>

      <div className="md:col-span-2 flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : defaults.brandName ? "Save changes" : "Create profile"}
        </button>
      </div>
    </form>
  );
}

function Metric({ label, value }) {
  return (
    <div className="soft-card">
      <div className="field-label">{label}</div>
      <div className="text-3xl font-black">{value ?? "—"}</div>
    </div>
  );
}

function EventCard({ event, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cx("event-card text-left w-full", active && "active")}>
      <div className="flex gap-4 items-start">
        <img
          src={event.thumbnail || "https://placehold.co/160x110?text=Event"}
          alt={event.eventName}
          className="w-28 h-20 rounded-2xl object-cover flex-shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black truncate">{event.eventName}</div>
              <div className="muted mt-1">
                {event.eventCategory?.name || event.eventCategoryName || "Event"} · {event.location}
              </div>
            </div>

            <span
              className={
                STATUS_CLASS[event.status || (new Date(event.date) < new Date() ? "completed" : "upcoming")] ||
                STATUS_CLASS.upcoming
              }
            >
              {event.status || (new Date(event.date) < new Date() ? "completed" : "upcoming")}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 text-sm faint">
            <span>Ask ₹{fmtINR(event.ask)}</span>
            <span>Capacity {event.capacity}</span>
            <span>
              {new Date(event.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function PredictionSummary({ prediction }) {
  const pred = prediction?.prediction || prediction?.data?.prediction || {};
  const brand = prediction?.brandAnalysis || prediction?.data?.brandAnalysis || {};
  const pct = Math.round((pred.feasibility_probability ?? pred.roi_probability ?? pred.probability ?? 0) * 100);
  const verdict = String(pred.band || pred.verdict || pred.overall_decision || "Medium potential").replaceAll("_", " ");

  const lines = [brand.summary, brand.fitSummary, brand.reasoning, pred.reasoning, pred.model_note].filter(Boolean);

  const fallback = `The model sees this as ${verdict.toLowerCase()} with an estimated ${pct}% sponsorship probability. Use the recommendations and outreach draft below to improve the fit before pitching this deal.`;

  return (
    <div className="grid xl:grid-cols-[1fr_1.15fr] gap-5">
      <div className="surface-card">
        <div className="field-label">Prediction verdict</div>
        <div className="text-5xl font-black mb-3">{pct}%</div>
        <div className="inline-flex items-center rounded-full px-4 py-2 bg-[color:rgba(109,94,252,0.12)] text-[var(--accent)] font-extrabold capitalize">
          {verdict.toLowerCase()}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Metric label="Feasibility" value={`${Math.round((pred.feasibility_probability || 0) * 100)}%`} />
          <Metric label="Predicted crowd" value={pred.predicted_crowd || pred.predicted_attendance || "—"} />
          <Metric label="Estimated ROI" value={pred.expected_roi ? `${pred.expected_roi}` : "—"} />
          <Metric
            label="Cost per reach"
            value={pred.cost_per_reach ? `₹${Number(pred.cost_per_reach).toFixed(2)}` : "—"}
          />
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div>
          <div className="field-label">Brand analysis</div>
          <p className="muted leading-7 text-base">{lines[0] || fallback}</p>
        </div>

        {Array.isArray(pred.recommendations) && pred.recommendations.length ? (
          <div>
            <div className="field-label">Recommendations</div>
            <div className="space-y-3">
              {pred.recommendations.slice(0, 4).map((rec, i) => (
                <div key={i} className="soft-card !p-4">
                  <p className="font-semibold leading-7">{typeof rec === "string" ? rec : JSON.stringify(rec)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {pred.cold_email || pred.outreach_email ? (
          <div>
            <div className="field-label">Outreach draft</div>
            <div className="soft-card !p-4 whitespace-pre-wrap text-sm leading-7">
              {coldEmailToText(pred.cold_email || pred.outreach_email)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedbackForm({ initial, onSubmit, submitting, submitLabel }) {
  const values = initial || {
    organizerReputation: 0.5,
    lineupQuality: 0.5,
    activationMaturity: 0.5,
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {[
        ["organizerReputation", "Organizer reputation"],
        ["lineupQuality", "Lineup quality"],
        ["activationMaturity", "Activation maturity"],
      ].map(([key, label]) => (
        <div key={key}>
          <div className="field-label">{label}</div>
          <input
            type="range"
            name={key}
            min="0"
            max="1"
            step="0.01"
            defaultValue={values[key]}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      ))}

      <button className="btn-primary" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

export default function SponsorDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [brandTypes, setBrandTypes] = useState([]);
  const [events, setEvents] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [myFeedback, setMyFeedback] = useState(null);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [profileMode, setProfileMode] = useState("view");
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSocket, setGlobalSocket] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    const s = io(SOCKET_URL, { withCredentials: true });
    
    s.on("connect", () => {
      s.emit("join_user_room", user._id);
    });

    s.on("new_notification", (data) => {
      console.log("GLOBAL NOTIFICATION RECEIVED 🔔", data);
      
      // Play sound
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      audio.play().catch(() => {});

      toast.success("New message from organizer!", {
        icon: '💬',
        duration: 4000
      });

      setUnreadCount(prev => prev + 1);
    });

    setGlobalSocket(s);
    return () => s.disconnect();
  }, [user?._id]);

  const loadBase = async () => {
    setLoading(true);
    try {
      const [typesRes, profileRes, eventsRes] = await Promise.allSettled([
        fetchBrandTypes(),
        getSponsorProfile(),
        getSponsorEvents({ page: 1, limit: 100 }),
      ]);

      if (typesRes.status === "fulfilled") {
        setBrandTypes(Array.isArray(typesRes.value) ? typesRes.value : typesRes.value?.data || []);
      }

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value?.data || profileRes.value || null);
      }

      if (eventsRes.status === "fulfilled") {
        const payload = eventsRes.value?.data || eventsRes.value;
        setEvents(payload?.events || payload?.data?.events || []);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBase();
  }, []);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;

    return events.filter((event) =>
      [event.eventName, event.location, event.eventCategory?.name].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [events, search]);

  const selectEvent = async (event) => {
    setSelectedEvent(event);
    setTab("overview");
    setPrediction(null);
    setMyFeedback(null);
    setWorkspaceLoading(true);

    try {
      const detailRes = await getSponsorEventById(event._id);
      setEventDetail(detailRes?.data || detailRes);

      try {
        const fbRes = await getMyEventFeedback(event._id);
        setMyFeedback(fbRes?.data || fbRes);
      } catch {
        setMyFeedback(null);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }

    setWorkspaceLoading(false);
  };

  const handlePredict = async () => {
    if (!selectedEvent) return;

    setTab("prediction");
    setPredicting(true);

    try {
      const res = await getEventPrediction(selectedEvent._id);
      setPrediction(res?.data || res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }

    setPredicting(false);
  };

  const toFormData = (form) => {
    const fd = new FormData();
    ["brandName", "brandType", "description", "brandKpi", "cityFocus"].forEach((k) =>
      fd.append(k, form.get(k) || "")
    );
    const file = form.get("logo");
    if (file?.size) fd.append("logo", file);
    return fd;
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);

    try {
      const res = await createSponsorProfile(toFormData(new FormData(e.currentTarget)));
      setProfile(res?.data || res);
      setProfileMode("view");
      toast.success("Sponsor profile created");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }

    setSubmittingProfile(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);

    try {
      const res = await updateSponsorProfile(toFormData(new FormData(e.currentTarget)));
      setProfile(res?.data || res);
      setProfileMode("view");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }

    setSubmittingProfile(false);
  };

  const handleDeleteProfile = async () => {
    setDeletingProfile(true);
    try {
      await deleteSponsorProfile();
      setProfile(null);
      setSelectedEvent(null);
      setEventDetail(null);
      toast.success("Profile deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setDeletingProfile(false);
  };

  const handleSubmitFeedback = async (e, isUpdate = false) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setSubmittingFeedback(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      organizerReputation: Number(form.get("organizerReputation") || 0.5),
      lineupQuality: Number(form.get("lineupQuality") || 0.5),
      activationMaturity: Number(form.get("activationMaturity") || 0.5),
    };

    try {
      if (isUpdate) await updateEventFeedback(selectedEvent._id, payload);
      else await giveEventFeedback(selectedEvent._id, payload);

      const fbRes = await getMyEventFeedback(selectedEvent._id);
      setMyFeedback(fbRes?.data || fbRes);
      toast.success(isUpdate ? "Feedback updated" : "Feedback submitted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }

    setSubmittingFeedback(false);
  };

  useEffect(() => {
    if (tab === "feedback") {
      getSponsorCompletedEvents({ page: 1, limit: 50 })
        .then((res) => {
          const payload = res?.data || res;
          setCompletedEvents(payload?.events || payload?.data?.events || []);
        })
        .catch(() => {});
    }
  }, [tab]);

  const organizerEmail =
    eventDetail?.organizerInfo?.email ||
    eventDetail?.organizer?.email ||
    selectedEvent?.organizerInfo?.email ||
    "";

  const organizerName =
    eventDetail?.organizerInfo?.username ||
    eventDetail?.organizerInfo?.name ||
    eventDetail?.organizerInfo?.fullName ||
    eventDetail?.organizer?.username ||
    "Organizer";

  const socialLinks = useMemo(
    () => normalizeSocialMedia(eventDetail?.socialMediaAccount || selectedEvent?.socialMediaAccount || []),
    [eventDetail, selectedEvent]
  );

  const copyToClipboard = async (text, successMessage = "Copied") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("Copy failed");
    }
  };

  const stats = {
    available: events.length,
    completed: completedEvents.length,
    profile: profile ? "Ready" : "Missing",
  };

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-6 items-start">
          <div>
            <div className="section-kicker mb-3">Sponsor dashboard</div>
            <h1 className="section-title !text-[clamp(2.4rem,5vw,4.8rem)] mb-4">
              Welcome, {user?.username || "Sponsor"}
            </h1>
            <p className="section-subtitle text-lg leading-8 max-w-3xl">
              Browse opportunities in a full-width event board, then open one event at a time for detailed
              analysis, prediction, and feedback.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard label="Available events" value={stats.available} />
            <StatCard label="Completed events" value={stats.completed} />
            <StatCard
              label="Profile status"
              value={stats.profile}
              hint={profile ? "You can edit it any time." : "Create it to unlock prediction."}
            />
          </div>
        </div>
      </section>

      <section className="surface-card">
        {loading ? (
          <div className="text-center py-20 muted">Loading dashboard...</div>
        ) : !profile || profileMode === "create" || profileMode === "edit" ? (
          <>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="section-kicker mb-2">Brand profile</div>
                <h2 className="text-3xl font-black">{profile ? "Edit sponsor profile" : "Create sponsor profile"}</h2>
              </div>
            </div>

            <SponsorProfileForm
              defaults={profile || {}}
              brandTypes={brandTypes}
              onSubmit={profile ? handleUpdateProfile : handleCreateProfile}
              submitting={submittingProfile}
            />
          </>
        ) : (
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="flex gap-5 items-start min-w-0">
              <img
                src={profile.logo || "https://placehold.co/120x120?text=Brand"}
                alt={profile.brandName}
                className="w-28 h-28 rounded-3xl object-cover flex-shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="text-4xl font-black mb-2">{profile.brandName}</div>
                <p className="section-subtitle leading-8 max-w-3xl">{profile.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="info-chip">{profile.brandType?.name || "Industry"}</span>
                  <span className="info-chip">{profile.brandKpi}</span>
                  <span className="info-chip">{profile.cityFocus}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setProfileMode("edit")}>
                Edit profile
              </button>
              <button className="btn-danger" onClick={handleDeleteProfile} disabled={deletingProfile}>
                {deletingProfile ? "Deleting..." : "Delete profile"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="section-kicker mb-2">Events board</div>
            <h2 className="text-3xl font-black">Browse opportunities</h2>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, or category"
              className="input-field min-w-[260px]"
            />
            {selectedEvent ? (
              <button className="btn-secondary" onClick={() => selectEvent(selectedEvent)}>
                Refresh event
              </button>
            ) : null}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="soft-card text-center py-16 muted">No sponsor-visible events found.</div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                active={selectedEvent?._id === event._id}
                onClick={() => selectEvent(event)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedEvent ? (
        <section className="workspace-panel space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-5 min-w-0">
              <img
                src={(eventDetail || selectedEvent).thumbnail || "https://placehold.co/360x240?text=Event"}
                alt={selectedEvent.eventName}
                className="w-44 h-32 rounded-3xl object-cover flex-shrink-0"
              />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-5xl font-black leading-none">{selectedEvent.eventName}</h3>
                  <span
                    className={
                      STATUS_CLASS[
                        (eventDetail || selectedEvent).status ||
                          (new Date(selectedEvent.date) < new Date() ? "completed" : "upcoming")
                      ] || STATUS_CLASS.upcoming
                    }
                  >
                    {(eventDetail || selectedEvent).status ||
                      (new Date(selectedEvent.date) < new Date() ? "completed" : "upcoming")}
                  </span>
                </div>

                <p className="section-subtitle text-lg leading-8 max-w-3xl">
                  {(eventDetail || selectedEvent).eventDescription}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="info-chip">
                    {eventDetail?.eventCategory?.name || selectedEvent.eventCategory?.name || "Event"}
                  </span>
                  <span className="info-chip">{selectedEvent.location}</span>
                  <span className="info-chip">
                    {new Date(selectedEvent.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="info-chip">{selectedEvent.isIndoor ? "Indoor" : "Outdoor"}</span>
                  {organizerEmail ? (
                    <a className="info-chip" href={`mailto:${organizerEmail}`}>
                      {organizerEmail}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="tab-row">
              {[
                ["overview", "Overview"],
                ["detail", "Event details"],
                ["prediction", "Prediction"],
                ["feedback", "Feedback"],
                ["chat", "Chat"],
              ].map(([id, label]) => (
                <button
                  key={id} 
                  className={cx(
                    "tab-pill relative transition-all duration-300", 
                    tab === id && "active",
                    id === "chat" && unreadCount > 0 && "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                  )} 
                  onClick={() => {
                    setTab(id);
                    if (id === "chat") setUnreadCount(0);
                  }}
                >
                  <span className={cx(id === "chat" && unreadCount > 0 && "text-red-500 font-bold")}>
                    {label}
                  </span>
                  {id === "chat" && unreadCount > 0 && (
                    <span className="absolute -top-3 -right-2 flex items-center justify-center scale-110">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-red-600 text-[11px] text-white font-black shadow-lg">
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {workspaceLoading ? <div className="soft-card text-center py-16 muted">Loading event workspace...</div> : null}

          {!workspaceLoading && tab === "overview" ? (
            <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
              <div className="surface-card">
                <div className="field-label">Workspace overview</div>
                <div className="metric-grid mt-5">
                  <Metric label="Brand KPI" value={profile?.brandKpi} />
                  <Metric label="Industry" value={profile?.brandType?.name} />
                  <Metric label="City focus" value={profile?.cityFocus} />
                  <Metric label="Selected ask" value={`₹${fmtINR(selectedEvent.ask)}`} />
                </div>
              </div>

              <div className="surface-card">
                <div className="field-label">Selected opportunity</div>
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <Metric label="Capacity" value={selectedEvent.capacity} />
                  <Metric label="Ticket price" value={`₹${fmtINR(selectedEvent.ticketPrice)}`} />
                  <Metric label="Marketing budget" value={`₹${fmtINR(selectedEvent.marketingBudget)}`} />
                  <Metric label="Feedback count" value={eventDetail?.totalFeedbacks || 0} />
                </div>
              </div>
            </div>
          ) : null}

          {!workspaceLoading && tab === "detail" ? (
            <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
              <div className="space-y-5">
                <div className="surface-card">
                  <div className="field-label">Event information</div>

                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <Metric label="Ask" value={`₹${fmtINR(selectedEvent.ask)}`} />
                    <Metric label="Ticket" value={`₹${fmtINR(selectedEvent.ticketPrice)}`} />
                    <Metric label="Capacity" value={selectedEvent.capacity} />
                    <Metric label="Marketing" value={`₹${fmtINR(selectedEvent.marketingBudget)}`} />
                  </div>

                  <div className="soft-card mt-5">
                    <div className="field-label">Description</div>
                    <p className="muted leading-7">{(eventDetail || selectedEvent).eventDescription}</p>
                  </div>

                  <div className="soft-card mt-5">
                    <div className="field-label">Organizer contact</div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="soft-card !p-4">
                        <div className="field-label">Organizer name</div>
                        <div className="text-2xl font-black">{organizerName}</div>
                      </div>

                      <div className="soft-card !p-4">
                        <div className="field-label">Contact email</div>
                        {organizerEmail ? (
                          <>
                            <div className="text-lg font-black break-all">{organizerEmail}</div>
                            <div className="flex flex-wrap gap-3 mt-4">
                              <a
                                className="btn-primary"
                                href={`mailto:${organizerEmail}?subject=${encodeURIComponent(
                                  `Sponsorship enquiry for ${selectedEvent.eventName}`
                                )}`}
                              >
                                Email organizer
                              </a>

                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => copyToClipboard(organizerEmail, "Email copied")}
                              >
                                Copy email
                              </button>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/10">
                              <button
                                className="btn-secondary w-full"
                                onClick={() => setTab("chat")}
                              >
                                Chat directly
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="muted leading-7">
                            Organizer email is not available in this event response yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="surface-card">
                  <div className="field-label">Organizer quality signals</div>
                  <div className="grid gap-4 mt-5">
                    <Metric
                      label="Organizer reputation"
                      value={eventDetail?.avgOrganizerReputation?.toFixed?.(2) || "0.00"}
                    />
                    <Metric label="Lineup quality" value={eventDetail?.avgLineupQuality?.toFixed?.(2) || "0.00"} />
                    <Metric
                      label="Activation maturity"
                      value={eventDetail?.avgActivationMaturity?.toFixed?.(2) || "0.00"}
                    />
                    <Metric label="Past events organized" value={eventDetail?.pastEventOrganized || 0} />
                  </div>
                </div>

                <div className="surface-card">
                  <div className="field-label">Social media verification</div>

                  {socialLinks.length ? (
                    <div className="grid gap-3 mt-5">
                      {socialLinks.map((item) => (
                        <div
                          key={item.id}
                          className="soft-card !p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="text-lg font-black">{item.platform}</div>
                            {item.handle ? (
                              <div className="muted break-all mt-1">
                                {String(item.handle).startsWith("@") ? item.handle : `@${item.handle}`}
                              </div>
                            ) : null}
                            {item.followers ? (
                              <div className="faint text-sm mt-2">Audience / followers: {item.followers}</div>
                            ) : null}
                            {item.href ? <div className="faint text-sm mt-2 break-all">{item.href}</div> : null}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {item.href ? (
                              <>
                                <a
                                  className="btn-secondary"
                                  href={item.href}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open profile
                                </a>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => copyToClipboard(item.href, "Social link copied")}
                                >
                                  Copy link
                                </button>
                              </>
                            ) : (
                              <span className="muted text-sm">No direct link available</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted mt-4 leading-7">
                      No social media handles were added by the organizer for this event.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {!workspaceLoading && tab === "prediction" ? (
            predicting ? (
              <div className="soft-card text-center py-16 muted">Generating prediction...</div>
            ) : prediction ? (
              <ResultsPanel
                brandCategory={profile?.brandType?.name || "Brand"}
                dealData={{
                  city: selectedEvent?.location || "",
                  event_type: eventDetail?.eventCategory?.name || selectedEvent?.eventCategory?.name || "Event",
                }}
                result={prediction}
              />
            ) : (
              <div className="surface-card text-center py-16">
                <div className="text-2xl font-black mb-3">Ready to evaluate this opportunity?</div>
                <p className="muted max-w-2xl mx-auto leading-7 mb-6">
                  Run the AI sponsorship prediction to see fit, probability, predicted reach, AI insights,
                  negotiation talking points, and an outreach draft.
                </p>
                <button className="btn-primary" onClick={handlePredict}>
                  Run prediction
                </button>
              </div>
            )
          ) : null}

          {!workspaceLoading && tab === "feedback" ? (
            <div className="grid xl:grid-cols-[1fr_.9fr] gap-5">
              <div className="surface-card">
                <div className="field-label">Your feedback for this event</div>

                {new Date(selectedEvent.date) >= new Date() ? (
                  <p className="muted mt-4 leading-7">Feedback opens after the event is completed.</p>
                ) : myFeedback ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mt-5">
                      <Metric
                        label="Organizer reputation"
                        value={`${Math.round((myFeedback.organizerReputation || 0) * 100)}%`}
                      />
                      <Metric
                        label="Lineup quality"
                        value={`${Math.round((myFeedback.lineupQuality || 0) * 100)}%`}
                      />
                      <Metric
                        label="Activation maturity"
                        value={`${Math.round((myFeedback.activationMaturity || 0) * 100)}%`}
                      />
                    </div>

                    <div className="mt-6">
                      <FeedbackForm
                        initial={myFeedback}
                        onSubmit={(e) => handleSubmitFeedback(e, true)}
                        submitting={submittingFeedback}
                        submitLabel="Update feedback"
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-6">
                    <FeedbackForm
                      initial={null}
                      onSubmit={(e) => handleSubmitFeedback(e, false)}
                      submitting={submittingFeedback}
                      submitLabel="Submit feedback"
                    />
                  </div>
                )}
              </div>

              <div className="surface-card">
                <div className="field-label">Completed events board</div>
                <div className="grid gap-3 mt-5 max-h-[420px] overflow-auto pr-1">
                  {completedEvents.length ? (
                    completedEvents.map((event) => (
                      <div key={event._id} className="soft-card">
                        <div className="font-extrabold text-lg">{event.eventName}</div>
                        <div className="muted mt-1">{event.location}</div>
                        <button className="btn-secondary mt-4" onClick={() => selectEvent(event)}>
                          Open event
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="muted">No completed events available yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className={tab === "chat" ? "block w-full h-[600px] mt-5" : "hidden"}>
            {selectedEvent && (
              <ChatBox
                eventId={selectedEvent._id}
                sponsorId={user?._id}
                organizerId={eventDetail?.organizerInfo?._id || eventDetail?.organizer?._id || selectedEvent?.organizer}
                currentUserRole="sponsor"
                embedded={true}
                isActive={tab === "chat"}
                onUnreadChange={(isUnread) => isUnread ? setUnreadCount(prev => prev + 1) : setUnreadCount(0)}
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}