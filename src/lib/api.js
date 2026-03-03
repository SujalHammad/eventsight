import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
});

export async function analyzeBrand(payload) {
  const { data } = await api.post("/analyze-brand", payload);
  return data;
}

export async function predictDeal(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}