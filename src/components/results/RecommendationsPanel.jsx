import React from "react";
import { parseMaybeJson } from "@/lib/utils";

function normalizeRecommendation(item) {
  const parsed = parseMaybeJson(item);
  if (typeof parsed === "string") {
    return { action: parsed, why: "", expected_effect: "" };
  }
  if (parsed && typeof parsed === "object") {
    return {
      action: parsed.action || parsed.title || "Recommendation",
      why: parsed.why || parsed.reason || parsed.description || "",
      expected_effect: parsed.expected_effect || parsed.impact || parsed.outcome || "",
    };
  }
  return null;
}

export default function RecommendationsPanel({ recs }) {
  const items = (Array.isArray(recs) ? recs : []).map(normalizeRecommendation).filter(Boolean);
  if (!items.length) return null;

  return (
    <section className="result-card">
      <div className="result-kicker result-kicker-good">Recommendations</div>
      <h3 className="result-section-title mt-1">Improve acceptance</h3>

      <div className="grid gap-4 mt-5">
        {items.map((item, index) => (
          <article key={index} className="result-accent-card result-accent-card-good">
            <div className="result-action-title">{item.action}</div>
            {item.why ? <p className="muted mt-3 leading-8">{item.why}</p> : null}
            {item.expected_effect ? <div className="result-impact mt-4">{item.expected_effect}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
