import React from "react";
import TopNav from "./TopNav";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen text-white">
      <TopNav />
      <div className="max-w-7xl mx-auto px-5 py-8">
        {children}
      </div>

      <div className="py-10 text-center text-xs text-white/50">
        SponsorWise • Portfolio build
      </div>
    </div>
  );
}