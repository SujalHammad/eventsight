import React from "react";
import ExecutiveSummary from "./ExecutiveSummary";
import AiInsightsPanel from "./AiInsightsPanel";
import RecommendationsPanel from "./RecommendationsPanel";
import NegotiationPanel from "./NegotiationPanel";
import OutreachPanel from "./OutreachPanel";
import { coldEmailToText } from "@/lib/utils";

function normalizeResult(result) {
  if (!result) return null;
  if (result.prediction && typeof result.prediction === "object") {
    return {
      ...result.prediction,
      brandAnalysis: result.brandAnalysis || null,
    };
  }
  return result;
}

export default function ResultsPanel({ brandCategory, dealData, result }) {
  const normalized = normalizeResult(result);

  if (!normalized) {
    return (
      <div className="surface-card text-center py-14">
        <div className="text-2xl font-black">No results yet</div>
        <div className="muted mt-2">Run prediction to see the sponsorship verdict, AI insights, recommendations, and outreach draft.</div>
      </div>
    );
  }

  const cold = coldEmailToText(normalized.cold_email);

  return (
    <div className="space-y-5">
      <ExecutiveSummary brandCategory={brandCategory} dealData={dealData} result={normalized} />
      <AiInsightsPanel insights={normalized.ai_insights} brandAnalysis={normalized.brandAnalysis} result={normalized} />
      <RecommendationsPanel recs={normalized.recommendations} />
      <NegotiationPanel points={normalized.negotiation_points} />
      <OutreachPanel text={cold} />
    </div>
  );
}
