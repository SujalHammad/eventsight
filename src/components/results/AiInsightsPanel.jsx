import React from "react";

function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function AiInsightsPanel({ insights, brandAnalysis, result }) {
  const kf = asList(insights?.key_factors);
  const wm = asList(insights?.what_it_means);
  const na = asList(insights?.next_actions);

  const hasInsightContent = insights?.headline || insights?.explanation || kf.length || wm.length || na.length;

  const fallbackFactors = [
    `Synergy (fit): ${Math.round(Number(result?.breakdown?.brand_synergy || 0))}/100`,
    `Predicted crowd: ${Number(result?.attendance || 0)} (occupancy ${Number(result?.breakdown?.occupancy_rate || 0).toFixed(1)}%)`,
    `Competition: ${Number(result?.breakdown?.competing_events || 0)} competing events`,
    `Cost per reach: Rs.${Number(result?.breakdown?.cost_per_head || 0).toFixed(2)}`,
    `Acceptance probability: ${Math.round(Number(result?.feasibility_probability || 0) * 100)}%`,
  ];

  const fallbackMeaning = [
    brandAnalysis?.positioning || "Synergy measures category and audience fit, but does not guarantee sponsor acceptance.",
    brandAnalysis?.fit_reason || "Potential reflects acceptance likelihood after accounting for competition and delivery risk.",
  ].filter(Boolean);

  const fallbackActions = [
    ...(Array.isArray(result?.recommendations) ? result.recommendations.slice(0, 2).map((item) => item?.action || item) : []),
  ].filter(Boolean);

  const cards = [
    { title: "Key factors", items: hasInsightContent ? kf : fallbackFactors },
    { title: "What it means", items: hasInsightContent ? wm : fallbackMeaning },
    { title: "Next actions", items: hasInsightContent ? na : fallbackActions },
  ];

  if (!cards.some((card) => card.items.length) && !insights?.headline && !insights?.explanation && !brandAnalysis?.summary) {
    return null;
  }

  return (
    <section className="result-card">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="result-kicker">AI insights</div>
          <h3 className="result-section-title mt-1">{insights?.headline || result?.verdict || "Decision support summary"}</h3>
          <p className="muted mt-2 text-lg leading-8 max-w-5xl">
            {insights?.explanation || brandAnalysis?.summary || "This score combines brand-event fit, deal economics, and market risk factors into one sponsor-facing recommendation."}
          </p>
        </div>
        <span className="result-chip">Groq</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="result-inline-card h-full">
            <div className="result-eyebrow">{card.title}</div>
            <ul className="result-list mt-3">
              {card.items.slice(0, 6).map((item, index) => (
                <li key={`${card.title}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {insights?.caution ? <div className="result-caution">{insights.caution}</div> : null}
    </section>
  );
}
