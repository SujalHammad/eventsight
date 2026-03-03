import React from "react";
import { cn } from "@/lib/utils";

export default function Badge({ className = "", children }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", className)}>
      {children}
    </span>
  );
}