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
    <div className="space-y-8 animate-fade-up">
      {step === 1 ? (
        <>
          <section className="hero-panel" style={{
            background: "linear-gradient(135deg, #6d5efc 0%, #4f46e5 100%)",
            color: "#fff",
            border: "none",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Subtle decorative glow */}
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-10%",
              width: "400px",
              height: "400px",
              background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)",
              pointerEvents: "none"
            }} />

            <div className="relative z-10">
              <div className="section-kicker !text-white/60 mb-3">SponsorWise predictor</div>
              <h1 className="section-title !text-white !text-[clamp(2.4rem,5vw,4.2rem)] mb-4">
                Build the sponsor brief first, then run a cleaner prediction.
              </h1>
              <p className="text-white/80 text-lg leading-8 max-w-3xl font-medium">
                Define the brand once, let the model understand the category and context, then move into the
                deal workspace with far less noise.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-10 relative z-10">
              <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
                <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-10">Flow</div>
                <div className="text-xl font-black">2-step predictor</div>
              </div>
              <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
                <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-10">Outcome</div>
                <div className="text-xl font-black">AI Analysis Report</div>
              </div>
            </div>
          </section>

          <div className="space-y-8">
            <section className="settings-card !max-w-none">
              <div className="space-y-2 mb-8 text-center sm:text-left">
                <div className="section-kicker">Strategic workflow</div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">A cleaner starting point</h2>
                <p className="muted text-base max-w-3xl">
                  The predictor works best when the brand context is set before event inputs. This keeps the deal
                  analysis sharper and makes the later AI output much more usable.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "01 · Brand fit", title: "Category mapping", desc: "Industry, tone, and context are captured once instead of being guessed later." },
                  { label: "02 · Quality", title: "Less noisy inputs", desc: "Deal scoring becomes easier to trust when the brand foundation is already defined." },
                  { label: "03 · AI output", title: "Smart recommendations", desc: "Persona and outreach guidance all improve with richer brand context." },
                  { label: "04 · Workflow", title: "Centralized workspace", desc: "Once step 1 is done, the full report workspace opens with the brand carried through." }
                ].map((item, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-[var(--bg-soft)] border border-[var(--line)] shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-4">{item.label}</div>
                    <div className="font-extrabold text-xl mb-2 text-[var(--text)]">{item.title}</div>
                    <p className="text-sm font-medium text-[var(--text-soft)] leading-relaxed opacity-80">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-6">
              <div className="text-center sm:text-left">
                <div className="section-kicker">Step 1</div>
                <h2 className="text-3xl font-black mt-2 tracking-tight">Brand workspace</h2>
                <p className="muted text-sm mt-3 leading-relaxed">Fill the company details and generate the profile before moving to event analysis.</p>
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
          <section className="hero-panel" style={{
            background: "linear-gradient(135deg, #6d5efc 0%, #4f46e5 100%)",
            color: "#fff",
            border: "none",
            position: "relative",
            overflow: "hidden"
          }}>
             {/* Decorative glow */}
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-10%",
              width: "400px",
              height: "400px",
              background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)",
              pointerEvents: "none"
            }} />

            <div className="relative z-10">
              <div className="section-kicker !text-white/60 mb-3">Step 2 • prediction workspace</div>
              <h1 className="section-title !text-white !text-[clamp(2rem,4vw,3.4rem)] mb-4">
                {brandData.company_name || "Brand"} sponsorship report
              </h1>
              <p className="text-white/80 text-lg leading-8 max-w-3xl font-medium">
                Tune the deal inputs on the left and use the report surface on the right for the verdict, AI explanation,
                recommendations, and outreach draft.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-8 relative z-10">
               <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
                <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-1">Industry</div>
                <div className="text-xl font-black">{brandData.industry || "—"}</div>
              </div>
              <div className="px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[200px]">
                <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-1">Target City</div>
                <div className="text-xl font-black">{dealData.city || "—"}</div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <div className="tab-row">
              <button className="tab-pill active">Deal Workspace</button>
              <button className="tab-pill" onClick={() => setStep(1)}>New Brand Brief</button>
            </div>
            <button type="button" onClick={() => setStep(1)} className="btn-secondary !rounded-2xl !py-3">
              ← Change brand context
            </button>
          </div>

          <div className="grid xl:grid-cols-[440px,minmax(0,1fr)] gap-8 items-start">
            <div className="space-y-6">
              <div>
                <div className="section-kicker">Input parameters</div>
                <h2 className="text-2xl font-black mt-2 tracking-tight">Event context</h2>
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

            <div className="space-y-6 min-w-0">
              <div>
                <div className="section-kicker">Intelligent analysis</div>
                <h2 className="text-2xl font-black mt-2 tracking-tight">Prediction report</h2>
                <p className="muted text-sm mt-3 leading-relaxed">
                  Results appear here after model execution. Data is compared against your brand brief for high-precision feasibility scoring.
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
