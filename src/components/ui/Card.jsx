import React from "react";
import { cn } from "@/lib/utils";

export default function Card({ className = "", children }) {
  return (
    <div
      className={cn(
        "surface-panel text-white",
        className
      )}
    >
      {children}
    </div>
  );
}
