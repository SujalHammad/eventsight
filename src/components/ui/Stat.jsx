import React from "react";
import { cn } from "@/lib/utils";

export default function Stat({ label, value, sub, className = "" }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-3", className)}>
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}