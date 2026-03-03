import React from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-xs font-black uppercase text-slate-500">Step 1</div>
          <div className="font-black text-lg">Brand Profile</div>
        </div>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-sm font-black text-slate-700 hover:text-slate-900 underline">
            Edit
          </button>
        )}
      </div>

      {step === 2 ? (
        <div className="p-5 sm:p-7 grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-2xl font-black">{brandData.company_name || "—"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="bg-slate-50 border-slate-200 text-slate-800">
                Category: {brandData.industry}
              </Badge>
              {brandResult?.persona ? (
                <Badge className="bg-indigo-50 border-indigo-200 text-indigo-800">
                  Persona: {String(brandResult.persona)}
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-500">Strategy</div>
              <div className="mt-1 text-slate-800 font-semibold">
                {brandResult?.strategy_statement ? `“${brandResult.strategy_statement}”` : "—"}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Target audience</div>
              <div className="mt-1 font-bold">{brandResult?.target_audience ? String(brandResult.target_audience) : "—"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Core values</div>
              <div className="mt-1 font-bold">{brandResult?.core_values ? String(brandResult.core_values) : "—"}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 text-white p-4">
              <div className="text-xs font-black uppercase text-slate-300">Next</div>
              <div className="mt-1 font-black text-lg">Evaluate a deal</div>
              <div className="mt-1 text-sm text-slate-200">
                Probability band + AI explanation + sponsor actions.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onAnalyzeBrand} className="p-5 sm:p-7">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-slate-500 ml-1">Company Name</label>
              <input
                name="company_name"
                value={brandData.company_name}
                onChange={(e) => setBrandData({ ...brandData, company_name: e.target.value })}
                placeholder="e.g., Coca-Cola"
                className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-500 ml-1">Industry Category</label>
              <select
                name="industry"
                value={brandData.industry}
                onChange={(e) => setBrandData({ ...brandData, industry: e.target.value })}
                className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:ring-4 focus:ring-slate-100 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <Button disabled={brandLoading} className="mt-5" type="submit">
            {brandLoading ? "Analyzing brand..." : "Generate Brand Profile"}
          </Button>

          {brandErr ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {brandErr}
            </div>
          ) : null}
        </form>
      )}
    </Card>
  );
}