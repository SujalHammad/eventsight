import React, { useEffect, useState } from "react";

import BrandPanel from "@/components/layout/BrandPanel";
import DealPanel from "@/components/deal/DealPanel";
import ResultsPanel from "@/components/results/ResultsPanel";

import { analyzeBrand, predictDeal, fetchBrandTypes, fetchEventCategories } from "@/lib/api";
import { getErrorMessage, clampNum } from "@/lib/utils";

export default function SponsorWisePage() {
  const [step, setStep] = useState(1);

  const BRAND_CATEGORIES_FALLBACK = [
    "Automobile", "Beauty/Personal Care", "Beverage", "Edtech", "FMCG",
    "Fintech", "Local Retail", "Real Estate", "Telecom",
  ];

  const EVENT_TYPES_FALLBACK = [
    "College Fest", "Cricket Screening", "Food Festival", "Music Concert",
    "Religious/Cultural", "Sports Tournament", "Standup Comedy", "Tech Meetup",
  ];

  const CITIES = [
    "Bhopal", "Burhanpur", "Chhindwara", "Damoh", "Dewas", "Gwalior", "Indore", "Jabalpur", "Katni",
    "Khandwa", "Khargone", "Mandsaur", "Morena", "Narmadapuram", "Neemuch", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni", "Shivpuri", "Singrauli", "Ujjain", "Vidisha",
  ];

  const [brandCategories, setBrandCategories] = useState(BRAND_CATEGORIES_FALLBACK);
  const [eventTypes, setEventTypes] = useState(EVENT_TYPES_FALLBACK);

  const KPI_OPTS = ["awareness", "hybrid", "leads", "sales"];
  const CITY_FOCUS_OPTS = ["all_mp", "metro", "tier2", "pilgrimage"];

  const [brandData, setBrandData] = useState({
    company_name: "",
    industry: "Beverage",
    brand_description: "",
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
    event_description: "",
  });

  const [result, setResult] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealErr, setDealErr] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMasterData = async () => {
      try {
        const [brandTypes, eventCategories] = await Promise.all([
          fetchBrandTypes(),
          fetchEventCategories(),
        ]);

        if (!isMounted) return;

        if (Array.isArray(brandTypes) && brandTypes.length) {
          setBrandCategories(brandTypes.map((b) => b.name || "").filter(Boolean));
        }

        if (Array.isArray(eventCategories) && eventCategories.length) {
          setEventTypes(eventCategories.map((c) => c.name || "").filter(Boolean));
        }
      } catch {
        // keep fallbacks
      }
    };

    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

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
        brand_name: brandData.company_name || "Brand",
        brand_description: brandData.brand_description || null,
        event_description: dealData.event_description || null,
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
    <div className="space-y-6 animate-fade-up">
      {step === 1 ? (
        <>
          <section className="hero-panel settings-hero">
            <div className="space-y-4">
              <div className="section-kicker">SponsorWise predictor</div>
              <h1 className="section-title !text-[clamp(2.15rem,4.6vw,4rem)]">Build the sponsor brief first, then run a cleaner prediction.</h1>
              <p className="section-subtitle text-lg leading-8 max-w-3xl">
                Define the brand once, let the model understand the category and context, then move into the
                deal workspace with far less noise.
              </p>
            </div>

            <div className="settings-hero-chip-row">
              <div className="settings-hero-chip">
                <span className="field-label !mb-1">Flow</span>
                <div className="text-lg font-black">2-step predictor</div>
              </div>
              <div className="settings-hero-chip">
                <span className="field-label !mb-1">Outcome</span>
                <div className="text-lg font-black">Prediction + AI recommendations</div>
              </div>
            </div>
          </section>

          <div className="settings-grid items-start">
            <section className="settings-card">
              <div className="space-y-2 mb-6">
                <div className="section-kicker">Why this flow works</div>
                <h2 className="text-2xl font-black">A cleaner starting point</h2>
                <p className="section-subtitle max-w-2xl">
                  The predictor works best when the brand context is set before event inputs. This keeps the deal
                  analysis sharper and makes the later AI output much more usable.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="soft-card">
                  <div className="field-label">Brand fit</div>
                  <div className="font-black text-lg mb-2">Clearer category mapping</div>
                  <p className="muted">Industry, tone, and context are captured once instead of being guessed later.</p>
                </div>
                <div className="soft-card">
                  <div className="field-label">Prediction quality</div>
                  <div className="font-black text-lg mb-2">Less noisy inputs</div>
                  <p className="muted">Deal scoring becomes easier to trust when the brand foundation is already defined.</p>
                </div>
                <div className="soft-card">
                  <div className="field-label">AI output</div>
                  <div className="font-black text-lg mb-2">Better recommendations</div>
                  <p className="muted">Persona, outreach, and next-step guidance all improve with richer brand context.</p>
                </div>
                <div className="soft-card">
                  <div className="field-label">Workflow</div>
                  <div className="font-black text-lg mb-2">Move to deals when ready</div>
                  <p className="muted">Once step 1 is done, the full report workspace opens with the brand carried through.</p>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <div>
                <div className="section-kicker">Step 1</div>
                <h2 className="text-2xl font-black mt-2">Brand workspace</h2>
                <p className="section-subtitle mt-2">Fill the company details and generate the profile before moving to event analysis.</p>
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
                categories={brandCategories}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="hero-panel settings-hero">
            <div className="space-y-3">
              <div className="section-kicker">Step 2 • prediction workspace</div>
              <h1 className="section-title !text-[clamp(2rem,4vw,3.4rem)]">{brandData.company_name || "Brand"} sponsorship report</h1>
              <p className="section-subtitle text-lg leading-8 max-w-3xl">
                Tune the deal inputs on the left and use the report surface on the right for the verdict, AI explanation,
                recommendations, and outreach draft.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-start xl:justify-end">
              <div className="settings-hero-chip min-w-[180px]">
                <span className="field-label !mb-1">Industry</span>
                <div className="text-lg font-black">{brandData.industry || "—"}</div>
              </div>
              <div className="settings-hero-chip min-w-[180px]">
                <span className="field-label !mb-1">Selected city</span>
                <div className="text-lg font-black">{dealData.city || "—"}</div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="tab-row">
              <span className="tab-pill active">Deal input</span>
              <span className="tab-pill">AI report</span>
            </div>
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              ← Back to brand workspace
            </button>
          </div>

          <div className="grid xl:grid-cols-[420px,minmax(0,1fr)] gap-6 items-start">
            <div className="space-y-4">
              <div>
                <div className="section-kicker">Deal form</div>
                <h2 className="text-2xl font-black mt-2">Event inputs</h2>
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
                EVENT_TYPES={eventTypes}
                KPI_OPTS={KPI_OPTS}
                CITY_FOCUS_OPTS={CITY_FOCUS_OPTS}
              />
            </div>

            <div className="space-y-4 min-w-0">
              <div>
                <div className="section-kicker">Report surface</div>
                <h2 className="text-2xl font-black mt-2">Prediction output</h2>
                <p className="section-subtitle mt-2">
                  Results appear here after you run the model. The whole area stays usable in both light and dark themes.
                </p>
              </div>
              <ResultsPanel brandCategory={brandData.industry} dealData={dealData} result={result} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
