import React from "react";
import { cn } from "@/lib/utils";

export default function Button({ className = "", variant = "primary", ...props }) {
  const base =
    "w-full rounded-2xl px-4 py-3 font-black transition disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-black"
      : variant === "soft"
      ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
      : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50";

  return <button className={cn(base, styles, className)} {...props} />;
}