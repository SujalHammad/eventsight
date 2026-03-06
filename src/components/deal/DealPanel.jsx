import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import OrganizerInputs from "./OrganizerInputs";

export default function DealPanel({
  step,
  dealData,
  setDealData,
  onRun,
  loading,
  error,
  showAdvanced,
  setShowAdvanced,
  CITIES,
  EVENT_TYPES,
  KPI_OPTS,
  CITY_FOCUS_OPTS,
}) {
  if (step !== 2) return null;

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-black uppercase text-slate-500">Step 2</div>
          <div className="font-black text-lg">Deal Inputs</div>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-black text-slate-700 hover:text-slate-900 underline"
        >
          {showAdvanced ? "Hide organizer inputs" : "Show organizer inputs"}
        </button>
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Event Type</label>
          <select
            value={dealData.event_type}
            onChange={(e) => setDealData((d) => ({ ...d, event_type: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100 cursor-pointer"
          >
            {EVENT_TYPES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">City</label>
          <select
            value={dealData.city}
            onChange={(e) => setDealData((d) => ({ ...d, city: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100 cursor-pointer"
          >
            {CITIES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Date</label>
          <input
            type="date"
            value={dealData.date}
            onChange={(e) => setDealData((d) => ({ ...d, date: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100"
            required
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Ask (₹)</label>
          <input
            type="number"
            value={dealData.sponsor_amount}
            onChange={(e) => setDealData((d) => ({ ...d, sponsor_amount: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-900 font-black outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Ticket Price</label>
          <input
            type="number"
            value={dealData.price}
            onChange={(e) => setDealData((d) => ({ ...d, price: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Capacity</label>
          <input
            type="number"
            value={dealData.venue_capacity}
            onChange={(e) => setDealData((d) => ({ ...d, venue_capacity: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Marketing Budget (₹)</label>
          <input
            type="number"
            value={dealData.marketing_budget}
            onChange={(e) => setDealData((d) => ({ ...d, marketing_budget: e.target.value }))}
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100"
          />
        </div>

        {/* ✅ NEW: Event Context / Description ONLY (Brand is in Step 1 now) */}
        <div className="lg:col-span-2">
          <label className="text-xs font-black uppercase text-slate-500 ml-1">Event Context & Description</label>
          <textarea
            rows="2"
            value={dealData.event_description || ""}
            onChange={(e) => setDealData((d) => ({ ...d, event_description: e.target.value }))}
            placeholder="E.g., A 3-day esports tournament featuring top regional players..."
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100 resize-none"
          />
        </div>
      </div>

      {showAdvanced && (
        <OrganizerInputs
          dealData={dealData}
          setDealData={setDealData}
          KPI_OPTS={KPI_OPTS}
          CITY_FOCUS_OPTS={CITY_FOCUS_OPTS}
        />
      )}

      <Button onClick={onRun} disabled={loading} className="mt-5">
        {loading ? "Running prediction..." : "Run ML Prediction"}
      </Button>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}
    </Card>
  );
}