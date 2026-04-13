import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  adminLogin,
  adminLogout,
  createBrandType,
  createCity,
  createEventCategory,
  deleteAdminEvent,
  deleteAdminUser,
  deleteBrandType,
  deleteCity,
  deleteEventCategory,
  fetchBrandTypes,
  fetchCities,
  fetchEventCategories,
  getAdminEvents,
  getAdminStats,
  getAdminUsers,
} from "@/lib/api";
import { fmtINR, getErrorMessage } from "@/lib/utils";

const cx = (...xs) => xs.filter(Boolean).join(" ");

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="field-label">{label}</div>
      <div className="text-4xl font-black">{value}</div>
    </div>
  );
}

function AdminLoginView({ onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await adminLogin({
        username: String(form.get("username") || "").trim(),
        password: String(form.get("password") || "").trim(),
      });
      onSuccess();
      toast.success("Admin signed in");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="hero-panel max-w-md w-full">
        <div className="section-kicker mb-3">Admin portal</div>
        <h1 className="section-title mb-2">Sign in to admin</h1>
        <p className="section-subtitle mb-8">Manage platform users, events, and master data.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Username</label>
            <input name="username" className="input-field" required />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input name="password" type="password" className="input-field" required />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brandTypes, setBrandTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [catName, setCatName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [cityName, setCityName] = useState("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await getAdminStats();
      setStats(res?.data || res);
    } catch (err) {
      if (err?.response?.status === 401) return setReady(false);
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({ search: userSearch, limit: 100 });
      setUsers(res?.data?.users || res?.data || []);
    } catch (err) {
      if (err?.response?.status === 401) return setReady(false);
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await getAdminEvents({ search: eventSearch, limit: 100 });
      setEvents(res?.data?.events || res?.data || []);
    } catch (err) {
      if (err?.response?.status === 401) return setReady(false);
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [cats, brands, cityRes] = await Promise.all([
        fetchEventCategories(),
        fetchBrandTypes(),
        fetchCities(),
      ]);
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      setBrandTypes(Array.isArray(brands) ? brands : brands?.data || []);
      setCities(Array.isArray(cityRes) ? cityRes : cityRes?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    if (tab === "stats") loadStats();
    if (tab === "users") loadUsers();
    if (tab === "events") loadEvents();
    if (tab === "master") loadMasterData();
  }, [ready, tab]);

  if (!ready) return <AdminLoginView onSuccess={() => setReady(true)} />;

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {}
    setReady(false);
  };

  const createItem = async (type, name) => {
    const value = String(name || "").trim();
    if (!value) return;
    try {
      if (type === "category") {
        await createEventCategory({ name: value });
        setCatName("");
      }
      if (type === "brand") {
        await createBrandType({ name: value });
        setBrandName("");
      }
      if (type === "city") {
        await createCity({ name: value });
        setCityName("");
      }
      toast.success("Created successfully");
      loadMasterData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="shell-wrap space-y-6">
      <section className="hero-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker mb-3">Admin dashboard</div>
            <h1 className="section-title mb-4">Platform control center</h1>
            <p className="section-subtitle text-lg max-w-3xl leading-8">Manage stats, users, events, and all master data in one clean workspace.</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => {
              if (tab === "stats") loadStats();
              if (tab === "users") loadUsers();
              if (tab === "events") loadEvents();
              if (tab === "master") loadMasterData();
            }}>Refresh</button>
            <button className="btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <div className="tab-row mt-8">
          {[["stats", "Stats"], ["users", "Users"], ["events", "Events"], ["master", "Master data"]].map(([id, label]) => (
            <button key={id} className={cx("tab-pill", tab === id && "active")} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </section>

      {tab === "stats" ? (
        <section className="workspace-panel">
          {loading ? <div className="soft-card text-center py-16 muted">Loading stats...</div> : stats ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total users" value={stats.totalUsers || 0} />
              <StatCard label="Organizers" value={stats.totalOrganizers || 0} />
              <StatCard label="Sponsors" value={stats.totalSponsors || 0} />
              <StatCard label="Recent users" value={stats.recentUsers || 0} />
              <StatCard label="Total events" value={stats.totalEvents || 0} />
              <StatCard label="Active events" value={stats.activeEvents || 0} />
              <StatCard label="Completed events" value={stats.completedEvents || 0} />
              <StatCard label="Event categories" value={stats.totalCategories || 0} />
            </div>
          ) : <div className="soft-card text-center py-16 muted">No stats available.</div>}
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="workspace-panel space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl font-black">Users</h2>
            <div className="flex gap-3">
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="input-field min-w-[240px]" placeholder="Search users" />
              <button className="btn-primary" onClick={loadUsers}>Search</button>
            </div>
          </div>
          <div className="grid gap-3">
            {users.map((user) => (
              <div key={user._id} className="soft-card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xl font-extrabold">{user.username}</div>
                  <div className="muted">{user.email}</div>
                  <div className="faint text-sm mt-1 uppercase tracking-[0.18em]">{user.role}</div>
                </div>
                <button className="btn-danger" onClick={async () => {
                  if (!window.confirm(`Delete ${user.username}?`)) return;
                  try { await deleteAdminUser(user._id); loadUsers(); toast.success("User deleted"); } catch (err) { toast.error(getErrorMessage(err)); }
                }}>Delete</button>
              </div>
            ))}
            {!users.length ? <div className="soft-card text-center py-12 muted">No users found.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === "events" ? (
        <section className="workspace-panel space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl font-black">Events</h2>
            <div className="flex gap-3">
              <input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} className="input-field min-w-[240px]" placeholder="Search events" />
              <button className="btn-primary" onClick={loadEvents}>Search</button>
            </div>
          </div>
          <div className="grid gap-3">
            {events.map((event) => (
              <div key={event._id} className="soft-card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xl font-extrabold">{event.eventName}</div>
                  <div className="muted">{event.location} · ₹{fmtINR(event.ask)}</div>
                  <div className="faint text-sm mt-1">Organizer: {event.organizerInfo?.username || "—"}</div>
                </div>
                <button className="btn-danger" onClick={async () => {
                  if (!window.confirm(`Delete ${event.eventName}?`)) return;
                  try { await deleteAdminEvent(event._id); loadEvents(); toast.success("Event deleted"); } catch (err) { toast.error(getErrorMessage(err)); }
                }}>Delete</button>
              </div>
            ))}
            {!events.length ? <div className="soft-card text-center py-12 muted">No events found.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === "master" ? (
        <section className="workspace-panel grid xl:grid-cols-3 gap-5">
          <div className="surface-card">
            <div className="field-label">Event categories</div>
            <div className="flex gap-3 mt-4 mb-5">
              <input value={catName} onChange={(e) => setCatName(e.target.value)} className="input-field" placeholder="Add category" />
              <button className="btn-primary" onClick={() => createItem("category", catName)}>Add</button>
            </div>
            <div className="grid gap-3 max-h-[380px] overflow-auto pr-1">
              {categories.map((cat) => (
                <div key={cat._id} className="soft-card flex items-center justify-between gap-3">
                  <div className="font-semibold">{cat.name}</div>
                  <button className="btn-danger !px-4 !py-2" onClick={async () => { if (!window.confirm(`Delete ${cat.name}?`)) return; try { await deleteEventCategory(cat._id); loadMasterData(); toast.success("Deleted"); } catch (err) { toast.error(getErrorMessage(err)); } }}>Delete</button>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card">
            <div className="field-label">Brand types</div>
            <div className="flex gap-3 mt-4 mb-5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="input-field" placeholder="Add brand type" />
              <button className="btn-primary" onClick={() => createItem("brand", brandName)}>Add</button>
            </div>
            <div className="grid gap-3 max-h-[380px] overflow-auto pr-1">
              {brandTypes.map((type) => (
                <div key={type._id} className="soft-card flex items-center justify-between gap-3">
                  <div className="font-semibold">{type.name}</div>
                  <button className="btn-danger !px-4 !py-2" onClick={async () => { if (!window.confirm(`Delete ${type.name}?`)) return; try { await deleteBrandType(type._id); loadMasterData(); toast.success("Deleted"); } catch (err) { toast.error(getErrorMessage(err)); } }}>Delete</button>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card">
            <div className="field-label">Cities</div>
            <div className="flex gap-3 mt-4 mb-5">
              <input value={cityName} onChange={(e) => setCityName(e.target.value)} className="input-field" placeholder="Add city" />
              <button className="btn-primary" onClick={() => createItem("city", cityName)}>Add</button>
            </div>
            <div className="grid gap-3 max-h-[380px] overflow-auto pr-1">
              {cities.map((city) => (
                <div key={city._id} className="soft-card flex items-center justify-between gap-3">
                  <div className="font-semibold">{city.name}</div>
                  <button className="btn-danger !px-4 !py-2" onClick={async () => { if (!window.confirm(`Delete ${city.name}?`)) return; try { await deleteCity(city._id); loadMasterData(); toast.success("Deleted"); } catch (err) { toast.error(getErrorMessage(err)); } }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
