import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"; 

function App() {
  const [step, setStep] = useState(1); 
  const evaluateRef = useRef(null); 

  // State
  const [brandData, setBrandData] = useState({ company_name: '', industry: '' });
  const [brandResult, setBrandResult] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);

  const [dealData, setDealData] = useState({
    city: 'Indore', event_type: 'Food Festival', 
    date: '', price: 100, marketing_budget: 5000, venue_capacity: 500, temperature: 30, is_raining: 0,
  });
  const [dealResult, setDealResult] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);
  const [dayName, setDayName] = useState("");

  const handleBrandChange = (e) => setBrandData({ ...brandData, [e.target.name]: e.target.value });
  const handleDealChange = (e) => setDealData({ ...dealData, [e.target.name]: e.target.value });

  useEffect(() => {
    if (dealData.date) {
        const d = new Date(dealData.date);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        setDayName(days[d.getDay()]);
    }
  }, [dealData.date]);

  // Submit Handlers
  const submitBrand = async (e) => {
    e.preventDefault();
    if(!brandData.company_name || !brandData.industry) return alert("Enter Name and Industry");
    setBrandLoading(true);
    try {
        const res = await axios.post('http://127.0.0.1:8000/analyze-brand', brandData);
        setBrandResult(res.data);
        setStep(2); 
        setTimeout(() => evaluateRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err) { console.error(err); } 
    finally { setBrandLoading(false); }
  };

  const submitDeal = async (e) => {
    e.preventDefault();
    setDealLoading(true); setDealResult(null);
    const dateObj = new Date(dealData.date);
    try {
        const res = await axios.post('http://127.0.0.1:8000/predict', {
            ...dealData,
            sponsor_category: `${brandData.company_name} (${brandData.industry})`, 
            day_of_week: isNaN(dateObj.getDay()) ? 6 : dateObj.getDay(),
            price: Number(dealData.price)||0, marketing_budget: Number(dealData.marketing_budget)||0,
            venue_capacity: Number(dealData.venue_capacity)||0,
        });
        setDealResult(res.data);
    } catch (err) { console.error(err); } 
    finally { setDealLoading(false); }
  };

  // Helpers
  const safe = (val) => Number(val) || 0;
  const glassCard = "bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl transition-all duration-300";
  const score = safe(dealResult?.final_score);
  const bd = dealResult?.breakdown || {};
  
  const getColor = (s) => s < 45 ? "text-red-500" : s < 75 ? "text-yellow-500" : "text-green-500";
  const getBg = (s) => s < 45 ? "bg-red-500" : s < 75 ? "bg-yellow-500" : "bg-green-500";
  const r = 60, circ = 2 * Math.PI * r;
  const offset = circ - ((score / 100) * circ);

  return (
    <div className="min-h-screen font-sans bg-cover bg-center text-slate-800" style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}>
      <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-sm fixed"></div>

      <header className="relative z-10 py-8 text-center">
         <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">Sponsor<span className="text-yellow-400">Wise</span></h1>
         <p className="text-indigo-200 font-medium">AI-Powered Sponsorship Intelligence</p>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20 space-y-8">
        
        {/* === STEP 1: BRAND ONBOARDING === */}
        <div className={`${glassCard} overflow-hidden`}>
            <div className="bg-indigo-50/50 p-6 border-b border-indigo-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> 
                    Brand Profile
                </h2>
                {step === 2 && <button onClick={() => setStep(1)} className="text-xs text-indigo-600 font-bold hover:underline">Edit</button>}
            </div>

            {step === 2 ? (
                <div className="p-8 bg-white flex items-center gap-6">
                    <div className="text-4xl">🏢</div>
                    <div>
                        <h3 className="text-2xl font-black text-indigo-900">{brandData.company_name}</h3>
                        <p className="text-slate-500 font-medium">{brandData.industry} • {brandResult?.persona}</p>
                    </div>
                    <div className="ml-auto bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 italic text-slate-600 text-sm">
                        "{brandResult?.strategy_statement}"
                    </div>
                </div>
            ) : (
                <form onSubmit={submitBrand} className="p-8">
                    <div className="grid md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Company Name</label>
                            <input name="company_name" onChange={handleBrandChange} className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold focus:border-indigo-500 outline-none text-lg" placeholder="e.g. Red Bull" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Industry</label>
                            <input name="industry" onChange={handleBrandChange} className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold focus:border-indigo-500 outline-none text-lg" placeholder="e.g. Energy Drinks" />
                        </div>
                    </div>
                    <button disabled={brandLoading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-1">
                        {brandLoading ? "Analyzing..." : "Generate Profile"}
                    </button>
                </form>
            )}
        </div>

        {/* === STEP 2: DEAL EVALUATOR === */}
        {step === 2 && (
            <div ref={evaluateRef} className={`${glassCard} p-8 animate-in fade-in slide-in-from-bottom-8 duration-700`}>
                <div className="mb-8 border-b border-slate-200 pb-4">
                    <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> 
                        Evaluate Deal
                    </h2>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* INPUT */}
                    <div className="lg:col-span-4 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        {['event_type', 'city'].map(f => (
                            <div key={f}>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">{f.replace('_',' ')}</label>
                            <select name={f} value={dealData[f]} onChange={handleDealChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                                {f==='city' ? ['Indore','Bhopal','Gwalior', 'Jabalpur'].map(o=><option key={o}>{o}</option>) : ['Food Festival','Tech Meetup','Music Concert', 'Comedy Show', 'Marathon'].map(o=><option key={o}>{o}</option>)}
                            </select>
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Date</label>
                                <input type="date" name="date" onChange={handleDealChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ask (₹)</label>
                                <input type="number" name="marketing_budget" onChange={handleDealChange} value={dealData.marketing_budget} className="w-full p-3 bg-white border border-indigo-200 text-indigo-700 rounded-xl font-black outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-bold text-slate-400 uppercase ml-1">Ticket Price</label><input type="number" name="price" onChange={handleDealChange} value={dealData.price} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" /></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase ml-1">Capacity</label><input type="number" name="venue_capacity" onChange={handleDealChange} value={dealData.venue_capacity} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" /></div>
                        </div>

                        <button onClick={submitDeal} disabled={dealLoading} className="w-full py-4 bg-indigo-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition">
                            {dealLoading ? "Predicting..." : "Analyze Impact"}
                        </button>
                    </div>

                    {/* RESULTS DASHBOARD */}
                    <div className="lg:col-span-8">
                        {dealResult ? (
                            <div className="h-full flex flex-col gap-6">
                                {/* TOP ROW: SCORE & CROWD */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                                        <div className="relative w-24 h-24 flex-shrink-0">
                                            <svg className="w-full h-full" viewBox="0 0 200 200">
                                                <circle className="text-slate-100" strokeWidth="15" stroke="currentColor" fill="transparent" r={r} cx="100" cy="100" />
                                                <circle stroke={score < 50 ? "#ef4444" : score < 75 ? "#eab308" : "#22c55e"} strokeWidth="15" strokeLinecap="round" fill="transparent" r={r} cx="100" cy="100" style={{ strokeDasharray: circ, strokeDashoffset: offset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'all 1s' }} />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className={`text-2xl font-black ${getColor(score)}`}>{score}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black uppercase ${getColor(score)}`}>{dealResult.verdict}</h3>
                                            <p className="text-xs text-slate-400 font-bold mt-1">Cost Efficiency: {safe(bd.cost_score)}%</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">ML Model Forecast</h4>
                                        <div className="flex items-end gap-2 mb-1">
                                            <span className="text-3xl font-black text-slate-800">{dealResult.attendance}</span>
                                            <span className="text-sm font-bold text-slate-400 mb-1">/ {dealData.venue_capacity} Attendees</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{width: `${safe(bd.audience_score)}%`}}></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">Adjusted for {dayName} in {dealData.city}.</p>
                                    </div>
                                </div>

                                {/* ANALYSIS TEXT */}
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Detailed Breakdown</h4>
                                    <p className="text-slate-700 font-medium leading-relaxed">"{dealResult.ai_analysis}"</p>
                                </div>

                                {/* SMART RECOMMENDATIONS */}
                                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100">
                                    <h4 className="text-xs font-bold text-yellow-600 uppercase mb-3 flex items-center gap-2">
                                        <span>🚀</span> Strategic Recommendations
                                    </h4>
                                    <ul className="space-y-2">
                                        {dealResult.tips?.map((tip, i) => (
                                            <li key={i} className="text-sm font-bold text-slate-700 flex items-start gap-2">
                                                <span className="text-yellow-500 mt-0.5">•</span> {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold p-10 text-center">
                                Select deal parameters to view Forecast & Analysis.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;