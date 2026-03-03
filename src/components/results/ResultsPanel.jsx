import React from "react";
import ExecutiveSummary from "./ExecutiveSummary";
import AiInsightsPanel from "./AiInsightsPanel";
import RecommendationsPanel from "./RecommendationsPanel";
import NegotiationPanel from "./NegotiationPanel";
import OutreachPanel from "./OutreachPanel";
import { coldEmailToText } from "@/lib/utils";

export default function ResultsPanel({ brandCategory, dealData, result }) {
  if (!result) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <div className="text-slate-900 font-black text-xl">No results yet</div>
        <div className="text-slate-600 mt-2">Run prediction to see sponsor-grade insights.</div>
      </div>
    );
  }

  const cold = coldEmailToText(result.cold_email);

  return (
    <div className="space-y-4">
      <ExecutiveSummary brandCategory={brandCategory} dealData={dealData} result={result} />
      <AiInsightsPanel insights={result.ai_insights} />
      <RecommendationsPanel recs={result.recommendations} />
      <NegotiationPanel points={result.negotiation_points} />
      <OutreachPanel text={cold} />
    </div>
  );
}