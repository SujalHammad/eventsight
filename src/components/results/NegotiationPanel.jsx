import React from "react";
import Card from "@/components/ui/Card";

export default function NegotiationPanel({ points }) {
  const items = Array.isArray(points) ? points : [];
  if (!items.length) return null;

  return (
    <Card className="p-5 sm:p-7 border-amber-200 bg-amber-50">
      <div className="text-xs font-black uppercase text-amber-700">Negotiation plan</div>
      <div className="mt-1 text-xl font-black text-slate-900">Handle objections</div>

      <div className="mt-4 grid gap-3">
        {items.slice(0, 3).map((p, i) => (
          <div key={i} className="rounded-2xl bg-white border border-amber-200 p-4">
            <div className="text-sm font-black text-slate-900">“{p.objection}”</div>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-black text-amber-700">Say:</span> {p.rebuttal}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}