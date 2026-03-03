import React from "react";
import { cn } from "@/lib/utils";

export default function Card({ className = "", children }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/85 backdrop-blur-xl",
        "shadow-[0_1px_0_rgba(255,255,255,.08),0_30px_90px_rgba(0,0,0,.35)]",
        "text-slate-900",
        className
      )}
    >
      {children}
    </div>
  );
}