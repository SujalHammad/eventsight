import React, { useState } from "react";

import AppShell from "@/components/layout/AppShell";
import BrandPanel from "@/components/layout/BrandPanel";
import DealPanel from "@/components/deal/DealPanel";
import ResultsPanel from "@/components/results/ResultsPanel";

import { analyzeBrand, predictDeal } from "@/lib/api";
import { getErrorMessage, clampNum } from "@/lib/utils";

export default function SponsorWisePage() {
  const [step, setStep] = useState(1);

  const BRAND_CATEGORIES = [
    "Automobile","Beauty/Personal Care","Beverage","Edtech","FMCG",
    "Fintech","Local Retail","Real Estate","Telecom",
  ];

  const CITIES = [
    "Bhopal","Burhanpur","Chhindwara","Damoh","Dewas","Gwalior","Indore","Jabalpur","Katni",
    "Khandwa","Khargone","Mandsaur","Morena","Narmadapuram","Neemuch","Ratlam","Rewa",
    "Sagar","Satna","Sehore","Seoni","Shivpuri","Singrauli","Ujjain","Vidisha",
  ];

  const EVENT_TYPES = [
    "College Fest","Cricket Screening","Food Festival","Music Concert",
    "Religious/Cultural","Sports Tournament","Standup Comedy","Tech Meetup",
  ];

  const KPI_OPTS = ["awareness", "hybrid", "leads", "sales"];
  const CITY_FOCUS_OPTS = ["all_mp", "metro", "tier2", "pilgrimage"];

  const [brandData, setBrandData] = useState({
    company_name: "",
    industry: "Beverage",
  });

  const [brandResult, setBrandResult] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandErr, setBrandErr] = useState("");

  const [dealData, setDealData] = useState({
    city: "Indore",
    event_type: "Food Festival",
    date: "2026-10-18",
    price: 0,
    marketing_budget: 120000,
    sponsor_amount: 45000,
    venue_capacity: 8000,

    organizer_reputation: 0.55,
    lineup_quality: 0.5,
    is_indoor: 0,
    social_media_reach: 15000,
    past_events_organized: 5,

    brand_kpi: "awareness",
    brand_city_focus: "all_mp",
    brand_activation_maturity: 0.55,
  });

  const [result, setResult] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealErr, setDealErr] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const onAnalyzeBrand = async (e) => {
    e.preventDefault();
    setBrandErr("");
    setBrandLoading(true);
    try {
      const data = await analyzeBrand(brandData);
      setBrandResult(data);
      setStep(2);
    } catch (err) {
      setBrandErr(getErrorMessage(err));
    } finally {
      setBrandLoading(false);
    }
  };

  const onRun = async () => {
    setDealErr("");
    setResult(null);
    setDealLoading(true);

    try {
      const payload = {
        city: dealData.city,
        event_type: dealData.event_type,
        sponsor_category: brandData.industry,
        date: dealData.date,

        price: clampNum(dealData.price, 0),
        marketing_budget: clampNum(dealData.marketing_budget, 0),
        sponsor_amount: clampNum(dealData.sponsor_amount, 0),
        venue_capacity: Math.max(0, parseInt(dealData.venue_capacity || 0, 10)),

        organizer_reputation: clampNum(dealData.organizer_reputation, 0.55),
        lineup_quality: clampNum(dealData.lineup_quality, 0.5),
        is_indoor: clampNum(dealData.is_indoor, 0),
        social_media_reach: Math.max(0, parseInt(dealData.social_media_reach || 0, 10)),
        past_events_organized: Math.max(0, parseInt(dealData.past_events_organized || 0, 10)),

        brand_kpi: dealData.brand_kpi,
        brand_city_focus: dealData.brand_city_focus,
        brand_activation_maturity: clampNum(dealData.brand_activation_maturity, 0.55),
      };

      const data = await predictDeal(payload);
      setResult(data);
    } catch (err) {
      setDealErr(getErrorMessage(err));
    } finally {
      setDealLoading(false);
    }
  };

  return (
    <AppShell>
      {/* ✅ Screen 1: Step 1 only */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto">
          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_40px_100px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-black text-white/60 uppercase">Window</div>
                <div className="text-lg font-black text-white">Brand Workspace</div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full border border-white/10 bg-white/10 text-white">
                Step 1
              </span>
            </div>

            <BrandPanel
              step={1}
              setStep={setStep}
              brandData={brandData}
              setBrandData={setBrandData}
              brandResult={brandResult}
              brandLoading={brandLoading}
              brandErr={brandErr}
              onAnalyzeBrand={onAnalyzeBrand}
              categories={BRAND_CATEGORIES}
            />
          </div>
        </div>
      )}

      {/* ✅ Screen 2: Inputs on top, Outputs below */}
      {step === 2 && (
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs font-black text-white/60 uppercase">Window</div>
              <div className="text-2xl font-black text-white">Deal + Sponsor Report</div>
              <div className="text-xs text-white/60 mt-1">
                Brand: <span className="text-white font-black">{brandData.company_name || "—"}</span> • Category:{" "}
                <span className="text-white font-black">{brandData.industry}</span>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl border border-white/10 bg-white/10 text-white font-black hover:bg-white/15"
            >
              ← Edit Brand (Back)
            </button>
          </div>

          {/* Main container */}
          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_40px_100px_rgba(0,0,0,.35)] space-y-4">
            {/* Inputs (top) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-black text-white/60 uppercase">Step 2</div>
                  <div className="text-lg font-black text-white">Deal Inputs</div>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full border border-white/10 bg-white/10 text-white">
                  Inputs
                </span>
              </div>

              <DealPanel
                step={2}
                dealData={dealData}
                setDealData={setDealData}
                onRun={onRun}
                loading={dealLoading}
                error={dealErr}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                CITIES={CITIES}
                EVENT_TYPES={EVENT_TYPES}
                KPI_OPTS={KPI_OPTS}
                CITY_FOCUS_OPTS={CITY_FOCUS_OPTS}
              />
            </div>

            {/* Outputs (below) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-black text-white/60 uppercase">Report</div>
                  <div className="text-lg font-black text-white">Sponsor Output</div>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full border border-white/10 bg-white/10 text-white">
                  Output
                </span>
              </div>

              <ResultsPanel brandCategory={brandData.industry} dealData={dealData} result={result} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}