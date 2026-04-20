import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { logout } from "@/lib/api";
import logo from "../../assets/logo.png";

const cx = (...xs) => xs.filter(Boolean).join(" ");

export default function TopNav({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = useMemo(() => {
    if (!user) return [];
    const items = [
      { to: "/", label: "Dashboard" },
      { to: "/settings", label: "Settings" },
    ];
    if (user.role === "sponsor") items.push({ to: "/sponsor-wise", label: "Predictor" });
    return items;
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {}
    setUser(null);
    setRole(null);
    navigate("/");
    setLoggingOut(false);
  };

  return (
    <header className="topbar">
      <div className="shell-wrap !py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/" className="flex items-center gap-4 min-w-0">
            <div className="logo-mark">
              <img src={logo} alt="SponsorWise" className="w-14 h-14 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-[2rem] font-black leading-none tracking-[-0.04em]">SponsorWise</div>
              <div className="text-sm faint truncate">AI sponsorship intelligence</div>
            </div>
          </Link>

          {user ? (
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} className={cx("nav-pill", active && "active")}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="soft-card !py-2.5 !px-3.5 flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white font-black flex items-center justify-center shadow-lg">
                  {user.username?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <div className="hidden sm:block min-w-0">
                  <div className="font-extrabold leading-none truncate">{user.username}</div>
                  <div className="text-xs faint uppercase tracking-[0.22em] mt-1">{user.role}</div>
                </div>
              </div>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="btn-secondary !rounded-full !px-5 !py-3">
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {user ? (
        <div className="shell-wrap md:hidden !pt-0 !pb-4">
          <div className="tab-row w-full justify-start overflow-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={cx("tab-pill whitespace-nowrap", active && "active")}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
