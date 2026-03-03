import React from "react";
import Card from "@/components/ui/Card";

export default function AiInsightsPanel({ insights }) {
  if (!insights) return null;

  const kf = Array.isArray(insights.key_factors) ? insights.key_factors : [];
  const wm = Array.isArray(insights.what_it_means) ? insights.what_it_means : [];
  const na = Array.isArray(insights.next_actions) ? insights.next_actions : [];

  return (
    <Card className="p-5 sm:p-7 border-indigo-200 bg-indigo-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase text-indigo-700">AI Insights</div>
          <div className="mt-1 text-xl font-black text-slate-900">{insights.headline || "AI Insights"}</div>
          {insights.explanation ? <div className="mt-2 text-slate-700">{insights.explanation}</div> : null}
        </div>
        <div className="px-3 py-1 rounded-full border border-indigo-200 bg-white text-indigo-800 text-xs font-black">
          Groq
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white border border-indigo-200 p-4">
          <div className="text-xs font-black uppercase text-slate-500">Key factors</div>
          <ul className="mt-2 text-sm text-slate-700 list-disc ml-5 space-y-1">
            {kf.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div className="rounded-2xl bg-white border border-indigo-200 p-4">
          <div className="text-xs font-black uppercase text-slate-500">What it means</div>
          <ul className="mt-2 text-sm text-slate-700 list-disc ml-5 space-y-1">
            {wm.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div className="rounded-2xl bg-white border border-indigo-200 p-4">
          <div className="text-xs font-black uppercase text-slate-500">Next actions</div>
          <ul className="mt-2 text-sm text-slate-700 list-disc ml-5 space-y-1">
            {na.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </div>

      {insights.caution ? <div className="mt-3 text-xs text-slate-600 italic">{insights.caution}</div> : null}
    </Card>
  );
}