import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

function InsightTile({ label, value, description }) {
  return (
    <div className="surface-subtle p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-base font-bold text-white">{value || "—"}</div>
      {description ? <div className="mt-1 text-sm leading-relaxed text-white/48">{description}</div> : null}
    </div>
  );
}

export default function BrandPanel({
  step,
  setStep,
  brandData,
  setBrandData,
  brandResult,
  brandLoading,
  brandErr,
  onAnalyzeBrand,
  categories,
}) {
  if (step === 2) {
    return (
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/8 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="kicker">Brand profile</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{brandData.company_name || "Your brand"}</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/52">
                  This brand snapshot is what the model and AI layers will use to frame sponsorship fit, positioning,
                  and negotiation language.
                </p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="btn-ghost px-4 py-3 text-xs">
                Edit profile
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-indigo-500/12 border-indigo-500/20 text-indigo-100">Industry · {brandData.industry}</Badge>
              {brandResult?.persona ? (
                <Badge className="bg-emerald-500/12 border-emerald-500/20 text-emerald-100">Persona · {brandResult.persona}</Badge>
              ) : null}
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-gradient-to-br from-indigo-500/12 via-transparent to-emerald-500/10 p-5">
              <div className="kicker">Strategy statement</div>
              <p className="mt-3 text-lg font-semibold leading-relaxed text-white/90">
                {brandResult?.strategy_statement ? `“${brandResult.strategy_statement}”` : "No strategy statement returned yet."}
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.035] p-5">
              <div className="kicker">Brand context</div>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                {brandData.brand_description || "Add a brand description to help AI explain why a partnership is strategically aligned."}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="kicker">AI brand readout</div>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-white">Decision-ready identity</h3>
            <div className="mt-5 grid gap-4">
              <InsightTile label="Target audience" value={brandResult?.target_audience} description="Audience segment the brand naturally resonates with." />
              <InsightTile label="Core values" value={brandResult?.core_values} description="Signals the emotional and thematic fit the brand wants in an event." />
              <div className="rounded-[24px] border border-white/8 bg-gradient-to-br from-white/6 to-white/[0.025] p-5">
                <div className="kicker">What happens next</div>
                <p className="mt-3 text-sm leading-relaxed text-white/58">
                  Move into deal evaluation to test event fit, probability band, AI rationale, and follow-up action plan.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Brand profile locked in
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-white/8 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="kicker">Step 1 · Brand foundation</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Define the brand you are pitching</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/52">
            Create a richer brand context first so the analysis and prediction surfaces feel like a premium decision room,
            not a raw form.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="metric-card">
              <div className="kicker">What this unlocks</div>
              <p className="mt-2 text-sm font-semibold text-white/84">Better sponsor fit explanation</p>
              <p className="mt-1 text-sm leading-relaxed text-white/45">Your brand context improves AI-generated positioning and outreach.</p>
            </div>
            <div className="metric-card">
              <div className="kicker">Used in later steps</div>
              <p className="mt-2 text-sm font-semibold text-white/84">Persona, KPI framing, messaging</p>
              <p className="mt-1 text-sm leading-relaxed text-white/45">The predictor and recommendation blocks reuse these fields later.</p>
            </div>
          </div>
        </div>

        <form onSubmit={onAnalyzeBrand} className="p-6 sm:p-8">
          <div className="grid gap-4">
            <div>
              <label className="field-label">Company name</label>
              <input
                name="company_name"
                value={brandData.company_name}
                onChange={(e) => setBrandData({ ...brandData, company_name: e.target.value })}
                placeholder="e.g. Red Bull India"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="field-label">Industry category</label>
              <select
                name="industry"
                value={brandData.industry}
                onChange={(e) => setBrandData({ ...brandData, industry: e.target.value })}
                className="input-field cursor-pointer"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Brand context & description</label>
              <textarea
                name="brand_description"
                rows="4"
                value={brandData.brand_description || ""}
                onChange={(e) => setBrandData({ ...brandData, brand_description: e.target.value })}
                placeholder="Summarize the brand promise, target audience, tone, and why the brand wants event partnerships."
                className="input-field min-h-[140px]"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={brandLoading} className="w-full sm:w-auto px-6 py-3.5 text-sm">
              {brandLoading ? "Analyzing brand..." : "Generate brand profile"}
            </Button>
            <div className="text-xs leading-relaxed text-white/40">
              This runs the AI brand profile so the deal workspace can be tailored to the sponsor.
            </div>
          </div>

          {brandErr ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
              {brandErr}
            </div>
          ) : null}
        </form>
      </div>
    </Card>
  );
}
