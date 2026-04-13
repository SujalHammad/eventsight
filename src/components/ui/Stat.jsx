import React from "react";
import { cn } from "@/lib/utils";

export default function Stat({ label, value, sub, className = "" }) {
  return (
    <div className={cn("stat-card p-4", className)}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
      {sub ? <div className="mt-1.5 text-xs leading-relaxed text-white/46">{sub}</div> : null}
    </div>
  );
}
