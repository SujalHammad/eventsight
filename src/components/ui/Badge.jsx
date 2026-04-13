import React from "react";
import { cn } from "@/lib/utils";

export default function Badge({ className = "", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/72",
        className
      )}
    >
      {children}
    </span>
  );
}
