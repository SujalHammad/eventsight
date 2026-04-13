import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import OrganizerInputs from "./OrganizerInputs";

function InputBlock({ label, children, note }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {note ? <div className="mt-1.5 text-xs text-white/35">{note}</div> : null}
    </div>
  );
}

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
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="kicker">Step 2 · Deal workspace</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Shape the event package</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/48">
            Enter the commercial and event details first. Advanced sliders let you simulate different organizer quality and execution scenarios.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="btn-ghost px-4 py-3 text-xs">
          {showAdvanced ? "Hide advanced inputs" : "Show advanced inputs"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <InputBlock label="Event type">
          <select value={dealData.event_type} onChange={(e) => setDealData((d) => ({ ...d, event_type: e.target.value }))} className="input-field cursor-pointer">
            {EVENT_TYPES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="City">
          <select value={dealData.city} onChange={(e) => setDealData((d) => ({ ...d, city: e.target.value }))} className="input-field cursor-pointer">
            {CITIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="Event date">
          <input type="date" value={dealData.date} onChange={(e) => setDealData((d) => ({ ...d, date: e.target.value }))} className="input-field" required />
        </InputBlock>

        <InputBlock label="Sponsor ask" note="How much funding the organizer is requesting.">
          <input type="number" value={dealData.sponsor_amount} onChange={(e) => setDealData((d) => ({ ...d, sponsor_amount: e.target.value }))} className="input-field" />
        </InputBlock>

        <InputBlock label="Ticket price">
          <input type="number" value={dealData.price} onChange={(e) => setDealData((d) => ({ ...d, price: e.target.value }))} className="input-field" />
        </InputBlock>

        <InputBlock label="Venue capacity">
          <input type="number" value={dealData.venue_capacity} onChange={(e) => setDealData((d) => ({ ...d, venue_capacity: e.target.value }))} className="input-field" />
        </InputBlock>

        <div className="lg:col-span-2 xl:col-span-3">
          <InputBlock label="Marketing budget">
            <input type="number" value={dealData.marketing_budget} onChange={(e) => setDealData((d) => ({ ...d, marketing_budget: e.target.value }))} className="input-field" />
          </InputBlock>
        </div>

        <div className="lg:col-span-2 xl:col-span-3">
          <InputBlock label="Event context" note="Used by the AI layer to explain the rationale, positioning, and negotiation style.">
            <textarea
              rows="4"
              value={dealData.event_description || ""}
              onChange={(e) => setDealData((d) => ({ ...d, event_description: e.target.value }))}
              placeholder="Describe the event format, crowd type, lineup strength, venue feel, and any unique sponsor activation opportunity."
              className="input-field min-h-[140px]"
            />
          </InputBlock>
        </div>
      </div>

      {showAdvanced && (
        <OrganizerInputs dealData={dealData} setDealData={setDealData} KPI_OPTS={KPI_OPTS} CITY_FOCUS_OPTS={CITY_FOCUS_OPTS} />
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-white/42">Run the prediction to generate feasibility, AI reasoning, recommendations, and outreach copy.</div>
        <Button onClick={onRun} disabled={loading} className="w-full sm:w-auto px-6 py-3.5 text-sm">
          {loading ? "Running prediction..." : "Run ML prediction"}
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {error}
        </div>
      ) : null}
    </Card>
  );
}
