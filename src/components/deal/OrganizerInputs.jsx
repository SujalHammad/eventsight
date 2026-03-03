import React from "react";

export default function OrganizerInputs({ dealData, setDealData, KPI_OPTS, CITY_FOCUS_OPTS }) {
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="text-xs font-black uppercase text-slate-600">Organizer inputs (testing)</div>

      <div>
        <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
          <span>Organizer reputation</span>
          <span className="text-slate-700">{Number(dealData.organizer_reputation).toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={dealData.organizer_reputation}
          onChange={(e) => setDealData((d) => ({ ...d, organizer_reputation: e.target.value }))}
          className="w-full mt-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
          <span>Lineup quality</span>
          <span className="text-slate-700">{Number(dealData.lineup_quality).toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={dealData.lineup_quality}
          onChange={(e) => setDealData((d) => ({ ...d, lineup_quality: e.target.value }))}
          className="w-full mt-2"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase text-slate-500">Indoor event?</div>
        <input
          type="checkbox"
          checked={Number(dealData.is_indoor) === 1}
          onChange={(e) => setDealData((d) => ({ ...d, is_indoor: e.target.checked ? 1 : 0 }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Social reach</label>
          <input
            type="number"
            value={dealData.social_media_reach}
            onChange={(e) => setDealData((d) => ({ ...d, social_media_reach: e.target.value }))}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Past events</label>
          <input
            type="number"
            value={dealData.past_events_organized}
            onChange={(e) => setDealData((d) => ({ ...d, past_events_organized: e.target.value }))}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
          <span>Activation maturity</span>
          <span className="text-slate-700">{Number(dealData.brand_activation_maturity).toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={dealData.brand_activation_maturity}
          onChange={(e) => setDealData((d) => ({ ...d, brand_activation_maturity: e.target.value }))}
          className="w-full mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Brand KPI</label>
          <select
            value={dealData.brand_kpi}
            onChange={(e) => setDealData((d) => ({ ...d, brand_kpi: e.target.value }))}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold outline-none cursor-pointer"
          >
            {KPI_OPTS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">City focus</label>
          <select
            value={dealData.brand_city_focus}
            onChange={(e) => setDealData((d) => ({ ...d, brand_city_focus: e.target.value }))}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold outline-none cursor-pointer"
          >
            {CITY_FOCUS_OPTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}