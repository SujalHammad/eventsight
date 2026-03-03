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

export function coldEmailToText(coldEmail) {
  if (!coldEmail) return "";
  if (typeof coldEmail === "string") return coldEmail;
  if (typeof coldEmail === "object") {
    const subj = coldEmail.Subject || coldEmail.subject || "";
    const body = coldEmail.Body || coldEmail.body || "";
    if (subj || body) return `Subject: ${subj}\n\n${body}`.trim();
    try {
      return JSON.stringify(coldEmail, null, 2);
    } catch {
      return String(coldEmail);
    }
  }
  return String(coldEmail);
}

export function getErrorMessage(err) {
  return (
    err?.response?.data?.detail ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

export function bandStyles(band) {
  switch (band) {
    case "HIGH":
      return { text: "text-emerald-700", pill: "bg-emerald-50 border-emerald-200 text-emerald-800" };
    case "MEDIUM":
      return { text: "text-amber-700", pill: "bg-amber-50 border-amber-200 text-amber-800" };
    case "LOW":
      return { text: "text-orange-700", pill: "bg-orange-50 border-orange-200 text-orange-800" };
    case "UNLIKELY":
      return { text: "text-red-700", pill: "bg-red-50 border-red-200 text-red-800" };
    default:
      return { text: "text-slate-700", pill: "bg-slate-50 border-slate-200 text-slate-800" };
  }
}