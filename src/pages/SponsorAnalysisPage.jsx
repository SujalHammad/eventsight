import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getSponsorEventById,
  getEventPrediction,
  getSponsorProfile,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import ResultsPanel from "@/components/results/ResultsPanel";
import { useAuth } from "@/context/AuthContext";

export default function SponsorAnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eventDetail, setEventDetail] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [detailRes, profRes, predRes] = await Promise.all([
        getSponsorEventById(id),
        getSponsorProfile(),
        getEventPrediction(id)
      ]);
      setEventDetail(detailRes?.data || detailRes);
      setProfile(profRes?.data || profRes);
      setPrediction(predRes?.data || predRes);
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate(-1);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-100 p-20">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--line)] border-t-[var(--accent)] animate-spin mb-6" />
        <p className="muted font-bold">AI is analyzing the brand-event fit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <button onClick={() => navigate(-1)} className="btn-secondary !py-2 !px-4">← Back to event</button>
         <div className="section-kicker">AI Analysis Result</div>
      </div>

      <ResultsPanel 
        brandCategory={profile?.brandType?.name || profile?.brandType || "Brand"} 
        dealData={eventDetail} 
        result={prediction} 
      />
    </div>
  );
}
