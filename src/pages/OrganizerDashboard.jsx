import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createEvent,
  deleteEvent,
  fetchCities,
  fetchEventCategories,
  getOrganizerEventById,
  getOrganizerEvents,
  updateEvent,
  backend,
} from "@/lib/api";
import { fmtINR, getErrorMessage } from "@/lib/utils";
import ChatBox from "@/components/ChatBox";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace("/api", "") || "http://localhost:8080";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const STATUS_CLASS = {
  upcoming: "status-chip status-upcoming",
  completed: "status-chip status-completed",
  cancelled: "status-chip status-cancelled",
};
const PLATFORMS = ["instagram", "youtube", "twitter", "facebook", "linkedin", "other"];

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="field-label">{label}</div>
      <div className="text-4xl font-black">{value}</div>
      {hint ? <div className="faint text-sm mt-2">{hint}</div> : null}
    </div>
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

function EventTile({ event, active, onClick }) {
  const status = event.status || (new Date(event.date) < new Date() ? "completed" : "upcoming");
  return (
    <button type="button" onClick={onClick} className={cx("event-card text-left w-full", active && "active")}>
      <div className="flex gap-4 items-start">
        <img src={event.thumbnail || "https://placehold.co/160x110?text=Event"} alt={event.eventName} className="w-28 h-20 rounded-2xl object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black truncate">{event.eventName}</div>
              <div className="muted mt-1">{event.eventCategory?.name || "Event"} · {event.location}</div>
            </div>
            <span className={STATUS_CLASS[status] || STATUS_CLASS.upcoming}>{status}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-sm faint">
            <span>Ask ₹{fmtINR(event.ask)}</span>
            <span>Capacity {event.capacity}</span>
            <span>{new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </button>
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
  const [preview, setPreview] = useState(event?.thumbnail || null);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div className="section-kicker mb-2">{event ? "Edit event" : "Create event"}</div>
            <h2 className="section-title !text-[clamp(2rem,4vw,3rem)]">{event ? event.eventName : "Create a new event"}</h2>
            <p className="section-subtitle mt-3 max-w-3xl">
              Set up the event details, sponsorship ask, and social reach in one polished form.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
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
            <div className="md:col-span-2">
              <label className="field-label">Description</label>
              <textarea name="eventDescription" defaultValue={event?.eventDescription || ""} rows={5} required className="textarea-field" />
            </div>
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
            <div>
              <label className="field-label">Capacity</label>
              <input name="capacity" type="number" min="1" defaultValue={event?.capacity || ""} required className="input-field" />
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input name="isIndoor" type="checkbox" defaultChecked={Boolean(event?.isIndoor)} className="w-5 h-5 accent-[var(--accent)]" />
              <label className="font-semibold">Indoor event</label>
            </div>
          </div>

          <div className="modal-section-grid">
            <div>
              <label className="field-label">Sponsorship ask</label>
              <input name="ask" type="number" min="0" defaultValue={event?.ask || ""} required className="input-field" />
            </div>
            <div>
              <label className="field-label">Ticket price</label>
              <input name="ticketPrice" type="number" min="0" defaultValue={event?.ticketPrice || ""} required className="input-field" />
            </div>
            <div>
              <label className="field-label">Marketing budget</label>
              <input name="marketingBudget" type="number" min="0" defaultValue={event?.marketingBudget || ""} required className="input-field" />
            </div>
            <div>
              <label className="field-label">Thumbnail</label>
              {preview ? <img src={preview} alt="Preview" className="modal-preview" /> : null}
              <input
                name="thumbnail"
                type="file"
                accept="image/*"
                className="input-field file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-white file:font-bold"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>

          <div className="modal-social-block">
            <div>
              <div className="section-kicker mb-2">Audience signals</div>
              <h3 className="text-2xl font-black">Social reach</h3>
              <p className="section-subtitle mt-2">Add the social accounts you want sponsors to see in the event workspace.</p>
            </div>
            <SocialRows initial={event?.socialMediaAccount || []} />
          </div>

          <div className="modal-actions">
            <button className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : event ? "Save event" : "Create event"}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizerDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [modalMode, setModalMode] = useState(null); // create/edit
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [eventConversations, setEventConversations] = useState([]);
  const [activeChatSponsor, setActiveChatSponsor] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!user?._id) return;
    const s = io(SOCKET_URL, { withCredentials: true });
    s.on("connect", () => s.emit("join_user_room", user._id));
    
    s.on("new_notification", (data) => {
      setUnreadCounts(prev => ({
        ...prev,
        [data.conversationId]: (prev[data.conversationId] || 0) + 1
      }));
      toast.success("New message from sponsor!");
    });

    return () => s.disconnect();
  }, [user?._id]);

  const loadEvents = async (type = filterType) => {
    try {
      const res = await getOrganizerEvents({ page: 1, limit: 100, ...(type ? { type } : {}) });
      const payload = res?.data || res;
      setEvents(payload?.events || payload?.data?.events || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [eventsRes, catsRes, citiesRes] = await Promise.allSettled([
          getOrganizerEvents({ page: 1, limit: 100 }),
          fetchEventCategories(),
          fetchCities(),
        ]);
        if (eventsRes.status === "fulfilled") {
          const payload = eventsRes.value?.data || eventsRes.value;
          setEvents(payload?.events || payload?.data?.events || []);
        }
        if (catsRes.status === "fulfilled") setCategories(Array.isArray(catsRes.value) ? catsRes.value : catsRes.value?.data || []);
        if (citiesRes.status === "fulfilled") setCities(Array.isArray(citiesRes.value) ? citiesRes.value : citiesRes.value?.data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadEvents(filterType);
  }, [filterType]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => [event.eventName, event.location, event.eventCategory?.name].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [events, search]);

  const openEvent = async (event) => {
    setSelectedEvent(event);
    setActiveChatSponsor(null);
    try {
      const res = await getOrganizerEventById(event._id);
      setEventDetail(res?.data || res);
      
      const convRes = await backend.get(`/chat/event/${event._id}`);
      setEventConversations(convRes.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const fd = new FormData();
    ["eventName", "eventCategory", "eventDescription", "location", "capacity", "date", "ask", "ticketPrice", "marketingBudget", "socialMediaAccount"].forEach((key) => fd.append(key, form.get(key) || ""));
    fd.append("isIndoor", form.get("isIndoor") ? "true" : "false");
    if (form.get("thumbnail")?.size) fd.append("thumbnail", form.get("thumbnail"));

    try {
      if (modalMode === "create") {
        const res = await createEvent(fd);
        toast.success("Event created");
        await loadEvents();
        setModalMode(null);
        if (res?.data || res) openEvent(res?.data || res);
      } else if (modalMode && selectedEvent?._id) {
        const res = await updateEvent(selectedEvent._id, fd);
        toast.success("Event updated");
        await loadEvents();
        setModalMode(null);
        setEventDetail(res?.data || res);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent?._id) return;
    if (!window.confirm(`Delete ${selectedEvent.eventName}?`)) return;
    try {
      await deleteEvent(selectedEvent._id);
      toast.success("Event deleted");
      setSelectedEvent(null);
      setEventDetail(null);
      await loadEvents();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const summary = {
    total: events.length,
    upcoming: events.filter((e) => new Date(e.date) >= new Date()).length,
    completed: events.filter((e) => new Date(e.date) < new Date()).length,
  };

  const detail = eventDetail || selectedEvent;

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker mb-3">Organizer dashboard</div>
            <h1 className="section-title !text-[clamp(2.4rem,5vw,4.8rem)] mb-4">Welcome, {user?.username || "Organizer"}</h1>
            <p className="section-subtitle text-lg max-w-3xl leading-8">
              Manage your events in one shared board. Open one event at a time for details, editing, and quality signals in a cleaner workspace.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setModalMode("create")}>+ Create event</button>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <StatCard label="Total events" value={summary.total} />
          <StatCard label="Upcoming events" value={summary.upcoming} />
          <StatCard label="Completed events" value={summary.completed} />
        </div>
      </section>

      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="section-kicker mb-2">Events board</div>
            <h2 className="text-3xl font-black">Your events</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="tab-row">
              {[["", "All"], ["upcoming", "Upcoming"], ["completed", "Completed"]].map(([id, label]) => (
                <button key={id} className={cx("tab-pill", filterType === id && "active")} onClick={() => setFilterType(id)}>{label}</button>
              ))}
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field min-w-[260px]" placeholder="Search events" />
          </div>
        </div>

        {loading ? <div className="soft-card text-center py-16 muted">Loading events...</div> : filteredEvents.length === 0 ? (
          <div className="soft-card text-center py-16 muted">No events found.</div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <EventTile key={event._id} event={event} active={selectedEvent?._id === event._id} onClick={() => openEvent(event)} />
            ))}
          </div>
        )}
      </section>

      {detail ? (
        <section className="workspace-panel">
          <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
            <div className="surface-card">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-5xl font-black leading-none">{detail.eventName}</h3>
                    <span className={STATUS_CLASS[detail.status || (new Date(detail.date) < new Date() ? "completed" : "upcoming")] || STATUS_CLASS.upcoming}>
                      {detail.status || (new Date(detail.date) < new Date() ? "completed" : "upcoming")}
                    </span>
                  </div>
                  <p className="section-subtitle text-lg leading-8">{detail.eventDescription}</p>
                </div>
                <img src={detail.thumbnail || "https://placehold.co/220x160?text=Event"} alt={detail.eventName} className="w-44 h-32 rounded-3xl object-cover" />
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="info-chip">{detail.eventCategory?.name || "Event"}</span>
                <span className="info-chip">{detail.location}</span>
                <span className="info-chip">{new Date(detail.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="info-chip">{detail.isIndoor ? "Indoor" : "Outdoor"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Ask" value={`₹${fmtINR(detail.ask)}`} />
                <Metric label="Ticket price" value={`₹${fmtINR(detail.ticketPrice)}`} />
                <Metric label="Capacity" value={detail.capacity} />
                <Metric label="Marketing budget" value={`₹${fmtINR(detail.marketingBudget)}`} />
              </div>
              {Array.isArray(detail.socialMediaAccount) && detail.socialMediaAccount.length ? (
                <div className="soft-card mt-5">
                  <div className="field-label">Social media reach</div>
                  <div className="grid gap-3 mt-3">
                    {detail.socialMediaAccount.map((account, index) => (
                      <div key={index} className="flex items-center justify-between gap-3">
                        <div className="font-semibold capitalize">{account.platform}</div>
                        <div className="muted">{fmtINR(account.followers || 0)} followers</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="surface-card">
              <div className="field-label">Event quality</div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <Metric label="Organizer reputation" value={detail.avgOrganizerReputation?.toFixed?.(2) || "0.00"} />
                <Metric label="Lineup quality" value={detail.avgLineupQuality?.toFixed?.(2) || "0.00"} />
                <Metric label="Activation maturity" value={detail.avgActivationMaturity?.toFixed?.(2) || "0.00"} />
                <Metric label="Feedback count" value={detail.totalFeedbacks || 0} />
              </div>
              <div className="flex flex-wrap gap-3 mt-8">
                <button className="btn-secondary" onClick={() => setModalMode("edit")}>Edit event</button>
                <button className="btn-danger" onClick={handleDelete}>Delete event</button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="field-label">Sponsor Chats</div>
                {eventConversations.length === 0 ? (
                  <p className="muted leading-7 mt-3">No sponsors have reached out for this event yet.</p>
                ) : (
                  <div className="space-y-3 mt-4">
                    {eventConversations.map(conv => (
                      <div key={conv._id} className="soft-card flex items-center justify-between p-4 relative overflow-visible">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {conv.sponsorId?.username || "Unknown Sponsor"}
                            {unreadCounts[conv._id] > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                                {unreadCounts[conv._id]}
                              </span>
                            )}
                          </div>
                          <div className="text-sm muted">{conv.lastMessage || "No messages yet"}</div>
                        </div>
                        <button 
                          className="btn-secondary" 
                          onClick={() => {
                            setActiveChatSponsor(conv.sponsorId?._id);
                            setUnreadCounts(prev => ({ ...prev, [conv._id]: 0 }));
                          }}
                        >
                          Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {activeChatSponsor && (
              <ChatBox
                eventId={detail._id}
                sponsorId={activeChatSponsor}
                organizerId={user?._id}
                currentUserRole="organizer"
                onClose={() => setActiveChatSponsor(null)}
              />
            )}
          </div>
        </section>
      ) : null}

      {modalMode ? (
        <EventForm
          event={modalMode === "edit" ? detail : null}
          categories={categories}
          cities={cities}
          onSubmit={submitForm}
          onClose={() => setModalMode(null)}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}
