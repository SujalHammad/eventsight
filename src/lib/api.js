import axios from "axios";

// ML service base URL (used by SponsorWise playground screen)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Node backend base URL (main app talks only to this)
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080/api/";

// Secret API Key for ML service (no hardcoded fallback)
export const API_KEY = import.meta.env.VITE_SERVICE_API_KEY;

// Axios instance for ML service
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  },
});

// Axios instance for Node backend
export const backend = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 25000,
  withCredentials: true,
});

// ─────────────────────────────
// ML service calls (playground)
// ─────────────────────────────

export async function analyzeBrand(payload) {
  const { data } = await api.post("/analyze-brand", payload);
  return data;
}

export async function predictDeal(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}

// ─────────────────────────────
// Admin — master data
// ─────────────────────────────

export async function fetchEventCategories() {
  const { data } = await backend.get("admin/categories");
  return data?.data || [];
}

export async function fetchBrandTypes() {
  const { data } = await backend.get("admin/brandTypes");
  return data?.data || [];
}

export async function createEventCategory(payload) {
  const { data } = await backend.post("admin/createCategory", payload);
  return data;
}

export async function createBrandType(payload) {
  const { data } = await backend.post("admin/createBrandType", payload);
  return data;
}

export async function fetchCities() {
  const { data } = await backend.get("admin/cities");
  return data?.data || [];
}

export async function createCity(payload) {
  const { data } = await backend.post("admin/createCity", payload);
  return data;
}

export async function deleteCity(id) {
  const { data } = await adminApi.delete(`admin/cities/${id}`);
  return data;
}

// ─────────────────────────────
// Auth routes
// ─────────────────────────────

export async function registerSponsor(payload) {
  const { data } = await backend.post("auth/register/sponsor", payload);
  return data;
}

export async function registerOrganizer(payload) {
  const { data } = await backend.post("auth/register/organizer", payload);
  return data;
}

export async function login(payload) {
  const { data } = await backend.post("auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await backend.post("auth/logout");
  return data;
}

export async function refreshToken() {
  const { data } = await backend.post("auth/refreshToken");
  return data;
}

export async function changePassword(payload) {
  const { data } = await backend.post("auth/changePassword", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await backend.get("auth/Current-user");
  return data;
}

export async function verifyOtp(payload) {
  const { data } = await backend.post("auth/verify-otp", payload);
  return data;
}

export async function forgetPassword(payload) {
  const { data } = await backend.post("auth/forget-password", payload);
  return data;
}

export async function resetPassword(payload) {
  const { data } = await backend.post("auth/reset-password", payload);
  return data;
}

export async function resendOtp(payload) {
  const { data } = await backend.post("auth/resend-otp", payload);
  return data;
}

export async function deleteAccount() {
  const { data } = await backend.delete("auth/delete-account");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await backend.patch("auth/update-profile", payload);
  return data;
}

// ─────────────────────────────
// Organizer routes
// ─────────────────────────────

export async function createEvent(formData) {
  const { data } = await backend.post("organizer/events", formData);
  return data;
}

export async function getOrganizerEvents(params = {}) {
  const { data } = await backend.get("organizer/events", { params });
  return data;
}

export async function getOrganizerEventById(eventId) {
  const { data } = await backend.get(`organizer/events/${eventId}`);
  return data;
}

export async function updateEvent(eventId, formData) {
  const { data } = await backend.patch(`organizer/events/${eventId}`, formData);
  return data;
}

export async function deleteEvent(eventId) {
  const { data } = await backend.delete(`organizer/events/${eventId}`);
  return data;
}

// ─────────────────────────────
// Sponsor routes
// ─────────────────────────────

export async function createSponsorProfile(formData) {
  const { data } = await backend.post("sponsor/profileCreate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getSponsorProfile() {
  const { data } = await backend.get("sponsor/profileFetch");
  return data;
}

export async function updateSponsorProfile(formData) {
  const { data } = await backend.patch("sponsor/profileUpdate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteSponsorProfile() {
  const { data } = await backend.delete("sponsor/profileDelete");
  return data;
}

export async function getSponsorEvents(params = {}) {
  const { data } = await backend.get("sponsor/events", { params });
  return data;
}

export async function getSponsorEventById(id) {
  const { data } = await backend.get(`sponsor/events/${id}`);
  return data;
}

export async function giveEventFeedback(eventId, payload) {
  const { data } = await backend.post(`sponsor/events/${eventId}/feedback`, payload);
  return data;
}

export async function getMyEventFeedback(eventId) {
  const { data } = await backend.get(`sponsor/events/${eventId}/feedback`);
  return data;
}

export async function updateEventFeedback(eventId, payload) {
  const { data } = await backend.patch(`sponsor/events/${eventId}/feedback`, payload);
  return data;
}

// Backend → ML prediction chain
export async function getEventPrediction(eventId) {
  const { data } = await backend.get(`sponsor/predict/${eventId}`);
  return data;
}

// Sponsor — completed events (for feedback board)
export async function getSponsorCompletedEvents(params = {}) {
  const { data } = await backend.get("sponsor/completed-events", { params });
  return data;
}

// ─────────────────────────────
// Admin routes
// ─────────────────────────────

// Separate axios instance for admin (uses adminToken cookie)
export const adminApi = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 25000,
  withCredentials: true,
});

export async function adminLogin(payload) {
  const { data } = await adminApi.post("admin/login", payload);
  return data;
}

export async function adminLogout() {
  const { data } = await adminApi.post("admin/logout");
  return data;
}

export async function getAdminStats() {
  const { data } = await adminApi.get("admin/stats");
  return data;
}

export async function getAdminUsers(params = {}) {
  const { data } = await adminApi.get("admin/users", { params });
  return data;
}

export async function deleteAdminUser(id) {
  const { data } = await adminApi.delete(`admin/users/${id}`);
  return data;
}

export async function getAdminEvents(params = {}) {
  const { data } = await adminApi.get("admin/events", { params });
  return data;
}

export async function deleteAdminEvent(id) {
  const { data } = await adminApi.delete(`admin/events/${id}`);
  return data;
}

export async function deleteEventCategory(id) {
  const { data } = await adminApi.delete(`admin/categories/${id}`);
  return data;
}

export async function deleteBrandType(id) {
  const { data } = await adminApi.delete(`admin/brandTypes/${id}`);
  return data;
}