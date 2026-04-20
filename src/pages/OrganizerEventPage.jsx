import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getOrganizerEventById,
  getOrganizerEvents,
  deleteEvent,
  updateEvent,
  backend,
  fetchEventCategories,
  fetchCities,
} from "@/lib/api";
import { fmtINR, getErrorMessage, resolveMediaUrl } from "@/lib/utils";
import ChatBox from "@/components/ChatBox";
import { useAuth } from "@/context/AuthContext";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const STATUS_CLASS = {
  upcoming: "status-chip status-upcoming",
  completed: "status-chip status-completed",
  cancelled: "status-chip status-cancelled",
};

const PLATFORMS = ["instagram", "youtube", "twitter", "facebook", "linkedin", "other"];

function Metric({ label, value }) {
  return (
    <div className="soft-card !p-4">
      <div className="field-label !mb-1 text-[10px]">{label}</div>
      <div className="text-2xl font-black">{value ?? "—"}</div>
    </div>
  );
}

function SocialRows({ initial }) {
  const [rows, setRows] = useState(() => initial?.length ? initial.map((item, index) => ({ id: index + 1, ...item })) : [{ id: 1, platform: "instagram", link: "", followers: "" }]);

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <label className="field-label !mb-0">Social media accounts</label>
        <button type="button" className="font-bold text-[var(--accent)]" onClick={() => setRows((prev) => [...prev, { id: Date.now(), platform: "instagram", link: "", followers: "" }])}>+ Add</button>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[120px_1fr_130px_40px] gap-3 items-center">
            <select value={row.platform} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, platform: e.target.value } : item))} className="select-field">
              {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
            <input value={row.link} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, link: e.target.value } : item))} className="input-field" placeholder="Profile URL" />
            <input value={row.followers} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, followers: e.target.value } : item))} className="input-field" type="number" min="0" placeholder="Followers" />
            <button type="button" className="btn-danger !p-0 !h-11 !rounded-2xl" onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}>×</button>
          </div>
        ))}
      </div>
      <input type="hidden" name="socialMediaAccount" value={JSON.stringify(rows.filter((row) => row.link).map((row) => ({ platform: row.platform, link: row.link, followers: Number(row.followers) || 0 })))} />
    </div>
  );
}

function EventForm({ event, categories, cities, onSubmit, onClose, submitting }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card animate-fade-up">
        <div className="modal-header">
          <div>
            <h3 className="text-3xl font-black">{event ? "Edit Event" : "Create Event"}</h3>
            <p className="muted mt-1">Configure your event metrics and sponsorship details.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
          <div className="modal-section-grid">
            <div>
              <label className="field-label">Event name</label>
              <input name="eventName" defaultValue={event?.eventName || ""} required className="input-field" />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select name="eventCategory" defaultValue={event?.eventCategory?._id || event?.eventCategory || ""} required className="select-field">
                <option value="">Select category</option>
                {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="field-label">Description</label>
             <textarea name="eventDescription" defaultValue={event?.eventDescription || ""} rows={3} required className="textarea-field" />
          </div>

          <div className="modal-section-grid">
            <div>
              <label className="field-label">City / location</label>
              <select name="location" defaultValue={event?.location || ""} required className="select-field">
                <option value="">Select city</option>
                {cities.map((city) => <option key={city._id} value={city.name}>{city.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Event date</label>
              <input name="date" type="date" defaultValue={event?.date ? new Date(event.date).toISOString().slice(0, 10) : ""} required className="input-field" />
            </div>
          </div>

          <div className="modal-section-grid">
             <div>
                <label className="field-label">Capacity</label>
                <input name="capacity" type="number" min="1" defaultValue={event?.capacity || ""} required className="input-field" />
             </div>
             <div>
                <label className="field-label">Ask (₹)</label>
                <input name="ask" type="number" min="0" defaultValue={event?.ask || ""} required className="input-field" />
             </div>
          </div>

          <div className="modal-section-grid">
             <div>
                <label className="field-label">Ticket Price (₹)</label>
                <input name="ticketPrice" type="number" min="0" defaultValue={event?.ticketPrice || 0} className="input-field" />
             </div>
             <div>
                <label className="field-label">Marketing Budget (₹)</label>
                <input name="marketingBudget" type="number" min="0" defaultValue={event?.marketingBudget || 0} className="input-field" />
             </div>
          </div>

          <div className="flex items-center gap-2">
            <input name="isIndoor" type="checkbox" defaultChecked={Boolean(event?.isIndoor)} className="w-5 h-5 accent-[var(--accent)]" id="indoor-check" />
            <label htmlFor="indoor-check" className="text-sm font-bold opacity-70">Indoor event</label>
          </div>

          <SocialRows initial={event?.socialMediaAccount} />

          <div>
            <label className="field-label">Thumbnail</label>
            <input name="thumbnail" type="file" accept="image/*" className="input-field" />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-4">
            {submitting ? "Saving..." : event ? "Save changes" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OrganizerEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [activeChatSponsor, setActiveChatSponsor] = useState(null);
  const [eventConversations, setEventConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const DEFAULT_RATINGS = { organizerReputation: 0.5, lineupQuality: 0.55, activationMaturity: 0.5 };

  const loadData = async () => {
    setLoading(true);
    try {
      const detailRes = await getOrganizerEventById(id);
      const payload = detailRes?.data || detailRes;
      setDetail(payload);

      const [catRes, cityRes, convRes] = await Promise.all([
        fetchEventCategories(),
        fetchCities(),
        backend.get(`/chat/event/${id}`).catch(() => ({ data: [] }))
      ]);
      setDetail(payload);
      setCategories(catRes);
      setCities(cityRes);
      setEventConversations(convRes?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate(-1);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
      navigate(-1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const rawForm = e.currentTarget;
    const form = new FormData();
    const fields = ["eventName", "eventCategory", "eventDescription", "location", "capacity", "date", "ask", "ticketPrice", "marketingBudget", "socialMediaAccount"];
    fields.forEach(f => {
      const val = rawForm.elements[f]?.value;
      if (val !== undefined) form.append(f, val);
    });
    if (rawForm.elements.isIndoor) form.append("isIndoor", rawForm.elements.isIndoor.checked);
    if (rawForm.elements.thumbnail?.files?.[0]) {
      form.append("thumbnail", rawForm.elements.thumbnail.files[0]);
    }
    form.append("_v", Date.now()); // Ensure body is never empty
    try {
      await updateEvent(id, form);
      toast.success("Event updated");
      setModalMode(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  const qualityMetrics = useMemo(() => {
    if (!detail) return {};
    const withFeedback = Boolean(detail.totalFeedbacks && detail.totalFeedbacks > 0);
    const r = (v) => parseFloat(v.toFixed(2));
    return {
      avgOrganizerReputation: r(detail.avgOrganizerReputation || DEFAULT_RATINGS.organizerReputation),
      avgLineupQuality: r(detail.avgLineupQuality || DEFAULT_RATINGS.lineupQuality),
      avgActivationMaturity: r(detail.avgActivationMaturity || DEFAULT_RATINGS.activationMaturity),
      totalFeedbacks: detail.totalFeedbacks || 0,
    };
  }, [detail]);

  if (loading) return <div className="text-center py-20 muted">Loading event management...</div>;
  if (!detail) return null;

  const isUpcoming = detail.status === "upcoming" || new Date(detail.date) >= new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
         <button onClick={() => navigate(-1)} className="btn-secondary !py-2 !px-4">← Back to dashboard</button>
      </div>

      <section className="workspace-panel space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-5 min-w-0">
            <img src={resolveMediaUrl(detail.thumbnail) || "https://placehold.co/360x240?text=Event"} alt={detail.eventName} className="w-44 h-32 rounded-3xl object-cover flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-5xl font-black leading-none">{detail.eventName}</h3>
                <span className={STATUS_CLASS[detail.status || (isUpcoming ? "upcoming" : "completed")] || STATUS_CLASS.upcoming}>
                  {detail.status || (isUpcoming ? "upcoming" : "completed")}
                </span>
              </div>
              <p className="section-subtitle text-lg leading-8 max-w-3xl">{detail.eventDescription}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="info-chip">{detail.eventCategory?.name || "Event"}</span>
                <span className="info-chip">{detail.location}</span>
                <span className="info-chip">{new Date(detail.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="info-chip">{detail.isIndoor ? "Indoor" : "Outdoor"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
             <button className="btn-primary" onClick={() => setModalMode("edit")}>Edit event</button>
             <button className="btn-danger" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#dc2626" }} onClick={handleDelete}>Delete event</button>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_auto] gap-6 items-start">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label="Ask" value={`₹${fmtINR(detail.ask)}`} />
              <Metric label="Ticket price" value={`₹${fmtINR(detail.ticketPrice)}`} />
              <Metric label="Capacity" value={detail.capacity} />
              <Metric label="Marketing budget" value={`₹${fmtINR(detail.marketingBudget)}`} />
           </div>

           <div className="surface-card min-w-[320px]">
              <div className="field-label">Quality signals</div>
              <div className="grid gap-4 mt-4">
                {[
                  ["Organizer reputation", qualityMetrics.avgOrganizerReputation],
                  ["Lineup quality", qualityMetrics.avgLineupQuality],
                  ["Activation maturity", qualityMetrics.avgActivationMaturity],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-bold mb-2">
                       <span className="muted uppercase tracking-wider">{label}</span>
                       <span>{Number(val).toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-soft)] rounded-full overflow-hidden">
                       <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, val * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="faint text-[10px] mt-6 uppercase tracking-wider font-extrabold">
                Based on {qualityMetrics.totalFeedbacks} sponsorship verdicts
              </div>
           </div>
        </div>

        {Array.isArray(detail.socialMediaAccount) && detail.socialMediaAccount.length ? (
          <div className="surface-card">
            <div className="field-label mb-4">Confirmed social reach</div>
            <div className="flex flex-wrap gap-3">
              {detail.socialMediaAccount.map((acc, i) => (
                <div key={i} className="soft-card !py-3 !px-5 flex items-center gap-4 min-w-[240px]">
                   <div className="font-bold capitalize">{acc.platform}</div>
                   <div className="h-4 w-[1px] bg-[var(--line)]" />
                   <div className="text-[var(--accent)] font-black">{fmtINR(acc.followers)} reach</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="surface-card">
           <div className="field-label mb-4">Sponsor inquiries</div>
           {eventConversations.length === 0 ? (
             <p className="muted py-10 text-center">No sponsors have contacted you for this event yet.</p>
           ) : (
             <div className="flex flex-wrap gap-3">
                {eventConversations.map(conv => (
                  <div key={conv._id} className="soft-card !py-3 !px-5 flex items-center gap-6 min-w-[300px]">
                    <div className="flex-1">
                      <div className="text-lg font-black">{conv.sponsorId?.username || "Sponsor"}</div>
                      <div className="muted text-xs truncate max-w-[180px]">{conv.lastMessage || "Opening inquiry..."}</div>
                    </div>
                    <button className="btn-secondary !py-2 !px-4 !text-xs" onClick={() => setActiveChatSponsor(conv.sponsorId?._id)}>Open Chat</button>
                  </div>
                ))}
             </div>
           )}
        </div>
      </section>

      {activeChatSponsor && (
        <ChatBox
          eventId={id}
          sponsorId={activeChatSponsor}
          organizerId={user?._id}
          currentUserRole="organizer"
          onClose={() => setActiveChatSponsor(null)}
        />
      )}

      {modalMode && (
        <EventForm
          event={modalMode === "edit" ? detail : null}
          categories={categories}
          cities={cities}
          onSubmit={submitForm}
          onClose={() => setModalMode(null)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
