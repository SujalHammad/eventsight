import React from "react";

function SliderRow({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.16em] text-white/38">
        <span>{label}</span>
        <span className="text-white/72">{Number(value).toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={onChange} className="feedback-slider range-track" />
    </div>
  );
}

export default function OrganizerInputs({ dealData, setDealData, KPI_OPTS, CITY_FOCUS_OPTS }) {
  return (
    <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="kicker">Advanced inputs</div>
          <h3 className="mt-2 text-lg font-black text-white">Organizer + sponsor quality signals</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/45">Use these when you want to simulate stronger or weaker execution quality for the same event.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Scenario lab
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SliderRow label="Organizer reputation" value={dealData.organizer_reputation} onChange={(e) => setDealData((d) => ({ ...d, organizer_reputation: e.target.value }))} />
        <SliderRow label="Lineup quality" value={dealData.lineup_quality} onChange={(e) => setDealData((d) => ({ ...d, lineup_quality: e.target.value }))} />
        <SliderRow label="Activation maturity" value={dealData.brand_activation_maturity} onChange={(e) => setDealData((d) => ({ ...d, brand_activation_maturity: e.target.value }))} />

        <div className="rounded-[20px] border border-white/8 bg-black/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/38">Venue mode</div>
              <div className="mt-1 text-sm font-semibold text-white">{Number(dealData.is_indoor) === 1 ? "Indoor" : "Outdoor"}</div>
            </div>
            <button
              type="button"
              onClick={() => setDealData((d) => ({ ...d, is_indoor: Number(d.is_indoor) === 1 ? 0 : 1 }))}
              className={`relative h-8 w-14 rounded-full transition ${Number(dealData.is_indoor) === 1 ? "bg-indigo-500/60" : "bg-white/12"}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${Number(dealData.is_indoor) === 1 ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="field-label">Social reach</label>
          <input type="number" value={dealData.social_media_reach} onChange={(e) => setDealData((d) => ({ ...d, social_media_reach: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="field-label">Past events</label>
          <input type="number" value={dealData.past_events_organized} onChange={(e) => setDealData((d) => ({ ...d, past_events_organized: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="field-label">Brand KPI</label>
          <select value={dealData.brand_kpi} onChange={(e) => setDealData((d) => ({ ...d, brand_kpi: e.target.value }))} className="input-field cursor-pointer">
            {KPI_OPTS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">City focus</label>
          <select value={dealData.brand_city_focus} onChange={(e) => setDealData((d) => ({ ...d, brand_city_focus: e.target.value }))} className="input-field cursor-pointer">
            {CITY_FOCUS_OPTS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
