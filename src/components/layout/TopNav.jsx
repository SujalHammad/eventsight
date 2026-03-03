import React from "react";
import { API_BASE } from "@/lib/api";

export default function TopNav() {
  return (
    <div className="sticky top-0 z-30">
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center font-black text-black">
              SW
            </div>
            <div>
              <div className="font-black text-lg leading-tight text-white">SponsorWise</div>
              <div className="text-xs text-white/70">Sponsor decision dashboard</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-white/60 font-bold">API</span>
            <span className="text-xs font-black text-white bg-white/10 border border-white/10 px-3 py-1 rounded-full">
              {API_BASE}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}