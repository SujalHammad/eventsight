import React from "react";
import { useAuth } from "@/context/AuthContext";
import SponsorDashboard from "./SponsorDashboard";
import OrganizerDashboard from "./OrganizerDashboard";

export default function DashboardSwitch() {
  const { user, role } = useAuth();
  if (role === "sponsor") return <SponsorDashboard user={user} />;
  if (role === "organizer") return <OrganizerDashboard user={user} />;
  return (
    <div className="flex items-center justify-center h-[60vh] text-sm text-white/60">
      Unknown role.
    </div>
  );
}
