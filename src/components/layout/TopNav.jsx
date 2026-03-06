import React from "react";
import { API_BASE } from "@/lib/api";
import logo from "../../assets/logo.png";

export default function TopNav() {
  return (
    <div className="sticky top-0 z-40 w-full">
      <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="bg-[#0B0F19]/90 backdrop-blur-2xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">

          <div className="flex items-center">
            {/* ✅ FIXED: Added brightness-0 invert to turn dark text into white */}
            <img
              src={logo}
              alt="SponsorWise Logo"
              className="h-16 sm:h-[76px] w-auto object-contain brightness-125 contrast-110 saturate-150 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-105"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-5 text-sm font-bold text-white/60">
              <span className="text-white cursor-pointer">Dashboard</span>
              <span className="hover:text-white cursor-pointer transition-colors">Deal Intelligence</span>
              <span className="hover:text-white cursor-pointer transition-colors">Reports</span>
            </div>

            <div className="h-6 w-px bg-white/10 hidden md:block"></div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">System Online</span>
                </div>
                <span className="text-xs font-mono text-white/40 mt-0.5">{API_BASE}</span>
              </div>

              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-400 border border-white/20 shadow-lg cursor-pointer flex items-center justify-center text-white font-black hover:ring-2 hover:ring-indigo-400 transition-all">
                RP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}