export function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function clampNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtINR(n) {
  const x = Math.round(clampNum(n, 0));
  return x.toLocaleString("en-IN");
}

export function pct(n, digits = 0) {
  const x = clampNum(n, 0);
  return `${x.toFixed(digits)}%`;
}

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function coldEmailToText(coldEmail) {
  if (!coldEmail) return "";
  const parsed = parseMaybeJson(coldEmail);
  if (typeof parsed === "string") return parsed;
  if (typeof parsed === "object") {
    const subj = parsed.Subject || parsed.subject || "";
    const body = parsed.Body || parsed.body || "";
    if (subj || body) return `Subject: ${subj}\n\n${body}`.trim();
    try {
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(parsed);
    }
  }
  return String(parsed);
}

export function getErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const backendOrigin = (import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080/api")
    .replace(/\/api\/?$/, "");

  let normalized = url.replace(/\\/g, "/").trim();
  normalized = normalized.replace(/^\.?\//, "");
  if (normalized.startsWith("public/")) normalized = normalized.slice("public/".length);

  return `${backendOrigin}/${normalized}`;
}

export function bandStyles(band) {
  switch (band) {
    case "HIGH":
      return { text: "var(--good)", chipBg: "rgba(16,185,129,.12)", chipText: "#047857" };
    case "MEDIUM":
      return { text: "var(--warn)", chipBg: "rgba(245,158,11,.14)", chipText: "#b45309" };
    case "LOW":
      return { text: "#c2410c", chipBg: "rgba(234,88,12,.12)", chipText: "#c2410c" };
    case "UNLIKELY":
      return { text: "var(--danger)", chipBg: "rgba(239,68,68,.12)", chipText: "#b91c1c" };
    default:
      return { text: "var(--text)", chipBg: "rgba(148,163,184,.14)", chipText: "var(--text-soft)" };
  }
}
