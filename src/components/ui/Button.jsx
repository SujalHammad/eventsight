import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  soft: "btn-soft",
};

export default function Button({ className = "", variant = "primary", ...props }) {
  return <button className={cn(variants[variant] || variants.primary, className)} {...props} />;
}
