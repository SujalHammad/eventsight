import React from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Stat from "@/components/ui/Stat";
import { bandStyles, fmtINR, clampNum } from "@/lib/utils";

export default function ExecutiveSummary({ brandCategory, dealData, result }) {
  if (!result) return null;

  const bd = result.breakdown || {};
  const styles = bandStyles(result.verdict_band || "UNKNOWN");

  const crowd = clampNum(result.attendance, 0);
  const prob = result.feasibility_probability;
  const probPct = prob === null || prob === undefined ? "—" : `${Math.round(clampNum(prob, 0) * 100)}%`;

  const synergy = Math.round(clampNum(bd.brand_synergy, 0));
  const occupancy = clampNum(bd.occupancy_rate, 0);
  const cost = clampNum(bd.cost_per_head, 0);
  const comp = clampNum(bd.competing_events, 0);

  return (
    <Card className="p-5 sm:p-7">
      {/* ✅ make it a clean grid so nothing gets cramped */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Left */}
        <div className="min-w-0">
          <div className={`text-3xl sm:text-4xl font-black leading-[1.0] ${styles.text}`}>
            {result.verdict}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={`border ${styles.pill}`}>{result.verdict_label || "POTENTIAL"}</Badge>
            <Badge className="bg-slate-50 border-slate-200 text-slate-800">
              Category: {brandCategory}
            </Badge>
            <Badge className="bg-slate-50 border-slate-200 text-slate-800">
              {dealData.event_type} • {dealData.city}
            </Badge>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">Synergy vs Potential</div>
            <div className="mt-1 text-sm text-slate-700 leading-relaxed">
              <span className="font-black">Synergy</span> = fit.{" "}
              <span className="font-black">Potential</span> = acceptance likelihood (fit + competition + credibility + package).
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-black uppercase text-slate-500">Model note</div>
            <div className="mt-1 text-slate-700 leading-relaxed">
              {result.ai_analysis ? `“${result.ai_analysis}”` : "—"}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Probability" value={probPct} sub="Acceptance likelihood" />
            <Stat label="Synergy" value={`${synergy}%`} sub="Fit score" />
            <Stat label="Predicted crowd" value={fmtINR(crowd)} sub="Stage-1 model" />
            <Stat label="Competing events" value={`${comp}`} sub="Attention dilution" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm font-black text-slate-700">
              <span>Occupancy</span>
              <span>{occupancy.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm font-black text-slate-700">
              <span>Cost / Reach</span>
              <span>₹{cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}