import React from "react";
import { bandStyles, clampNum, fmtINR, parseMaybeJson } from "@/lib/utils";

function Chip({ children, tone }) {
  return (
    <span className="result-chip" style={tone ? { background: tone.chipBg, color: tone.chipText } : undefined}>
      {children}
    </span>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="result-stat-box">
      <div className="result-eyebrow">{label}</div>
      <div className="result-stat-value">{value}</div>
      {sub ? <div className="result-subcopy">{sub}</div> : null}
    </div>
  );
}

export default function ExecutiveSummary({ brandCategory, dealData, result }) {
  if (!result) return null;

  const band = result.verdict_band || "UNKNOWN";
  const styles = bandStyles(band);

  const crowd = clampNum(result.attendance, 0);
  const prob = result.feasibility_probability;
  const probPct = prob === null || prob === undefined ? "—" : `${Math.round(clampNum(prob, 0) * 100)}%`;
  const synergy = Math.round(clampNum(result?.breakdown?.brand_synergy, 0));
  const occupancy = clampNum(result?.breakdown?.occupancy_rate, 0);
  const cost = clampNum(result?.breakdown?.cost_per_head, 0);
  const comp = clampNum(result?.breakdown?.competing_events, 0);
  const modelNote = result.ai_analysis || result.model_note || "The score blends brand-event fit, expected reach, and deal economics.";

  return (
    <section className="result-card result-summary-card">
      <div className="result-summary-grid">
        <div>
          <div className="result-kicker" style={{ color: styles.text }}>Prediction verdict</div>
          <h2 className="result-hero-title" style={{ color: styles.text }}>{result.verdict || "Potential"}</h2>

          <div className="result-chip-row">
            <Chip tone={styles}>{result.verdict_label || "Potential"}</Chip>
            <Chip>{`Category: ${brandCategory}`}</Chip>
            <Chip>{`${dealData.event_type} • ${dealData.city}`}</Chip>
          </div>

          <div className="result-note-card">
            <div className="result-eyebrow">Synergy vs potential</div>
            <p className="result-note-copy">
              <strong>Synergy</strong> is the fit score. <strong>Potential</strong> is the acceptance likelihood after accounting for fit,
              competition, organizer credibility, and packaging economics.
            </p>
          </div>

          <div className="result-note-text">
            <div className="result-eyebrow">Model note</div>
            <p className="muted leading-8 mt-2">“{modelNote}”</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="result-stat-grid">
            <StatBox label="Probability" value={probPct} sub="Acceptance likelihood" />
            <StatBox label="Synergy" value={`${synergy}%`} sub="Fit score" />
            <StatBox label="Predicted crowd" value={crowd ? fmtINR(crowd) : "—"} sub="Stage-1 model" />
            <StatBox label="Competing events" value={comp || 0} sub="Attention dilution" />
          </div>

          <div className="result-inline-card">
            <div className="flex items-center justify-between font-extrabold text-[var(--text-soft)]">
              <span>Occupancy</span>
              <span>{occupancy.toFixed(1)}%</span>
            </div>
            <div className="result-progress mt-3">
              <div className="result-progress-bar" style={{ width: `${Math.max(0, Math.min(100, occupancy))}%` }} />
            </div>
            <div className="flex items-center justify-between mt-5 font-extrabold text-[var(--text-soft)]">
              <span>Cost / Reach</span>
              <span>{cost ? `₹${cost.toFixed(2)}` : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
