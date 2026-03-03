import React from "react";
import Card from "@/components/ui/Card";

export default function RecommendationsPanel({ recs }) {
  const items = Array.isArray(recs) ? recs : [];
  if (!items.length) return null;

  return (
    <Card className="p-5 sm:p-7 border-emerald-200 bg-emerald-50">
      <div className="text-xs font-black uppercase text-emerald-700">Recommendations</div>
      <div className="mt-1 text-xl font-black text-slate-900">Improve acceptance</div>

      <div className="mt-4 grid gap-3">
        {items.map((r, idx) => (
          <div key={idx} className="rounded-2xl bg-white border border-emerald-200 p-4">
            <div className="font-black text-slate-900">{r.action}</div>
            <div className="mt-2 text-sm text-slate-700">{r.why}</div>
            <div className="mt-2 text-sm font-black text-emerald-700">{r.expected_effect}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}