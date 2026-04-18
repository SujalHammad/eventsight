export const ML_BRAND_CATEGORIES = [
  "Automobile",
  "Beauty/Personal Care",
  "Beverage",
  "Edtech",
  "FMCG",
  "Fintech",
  "Local Retail",
  "Real Estate",
  "Telecom",
];

export const ML_EVENT_TYPES = [
  "College Fest",
  "Cricket Screening",
  "Food Festival",
  "Music Concert",
  "Religious/Cultural",
  "Sports Tournament",
  "Standup Comedy",
  "Tech Meetup",
];

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const keywordIncludes = (haystack, needles) => needles.some((needle) => haystack.includes(needle));

export function canonicalMlBrandCategory(rawBrandType = "") {
  const value = normalize(rawBrandType);

  if (["automobile", "automotive", "vehicle", "mobility", "ev"].includes(value)) return "Automobile";
  if (["beauty", "personal care", "health", "wellness", "health wellness"].includes(value)) return "Beauty/Personal Care";
  if (["beverage", "drinks"].includes(value)) return "Beverage";
  if (["education", "edtech", "learning"].includes(value)) return "Edtech";
  if (["fmcg", "food beverage", "food and beverage", "food"].includes(value)) return "FMCG";
  if (["fintech", "finance", "finance banking", "banking", "payments"].includes(value)) return "Fintech";
  if (["retail", "local retail", "e commerce", "ecommerce", "travel tourism", "travel", "tourism"].includes(value)) return "Local Retail";
  if (["real estate", "property"].includes(value)) return "Real Estate";
  if (["technology", "tech", "telecom", "software", "electronics", "entertainment", "media", "streaming"].includes(value)) return "Telecom";
  if (["fashion apparel", "fashion", "apparel", "sports fitness", "fitness"].includes(value)) return "Local Retail";

  if (keywordIncludes(value, ["beauty", "wellness", "health", "skin", "personal"])) return "Beauty/Personal Care";
  if (keywordIncludes(value, ["drink", "beverage", "juice", "cola", "water"])) return "Beverage";
  if (keywordIncludes(value, ["food", "snack", "grocery", "consumer goods"])) return "FMCG";
  if (keywordIncludes(value, ["bank", "finance", "payment", "wallet", "insurance", "loan"])) return "Fintech";
  if (keywordIncludes(value, ["education", "learning", "academy", "course", "training"])) return "Edtech";
  if (keywordIncludes(value, ["property", "real estate", "builder", "housing"])) return "Real Estate";
  if (keywordIncludes(value, ["car", "bike", "vehicle", "mobility", "automobile", "ev"])) return "Automobile";
  if (keywordIncludes(value, ["tech", "software", "digital", "media", "telecom", "entertainment", "streaming"])) return "Telecom";
  if (keywordIncludes(value, ["retail", "ecommerce", "marketplace", "travel", "tourism", "hotel", "restaurant"])) return "Local Retail";

  return null;
}

export function canonicalMlEventType(rawEventType = "") {
  const value = normalize(rawEventType);

  if (["music concert", "concert", "live music"].includes(value)) return "Music Concert";
  if (["food festival", "food fair"].includes(value)) return "Food Festival";
  if (["comedy show", "standup comedy", "stand up comedy"].includes(value)) return "Standup Comedy";
  if (["cultural festival", "religious cultural", "charity gala", "art exhibition"].includes(value)) return "Religious/Cultural";
  if (["sports event", "sports tournament", "gaming tournament", "esports tournament"].includes(value)) return "Sports Tournament";
  if (["hackathon", "startup pitch", "tech conference", "business conference", "meetup"].includes(value)) return "Tech Meetup";
  if (["fashion show", "college fest"].includes(value)) return "College Fest";
  if (["cricket screening", "watch party"].includes(value)) return "Cricket Screening";

  if (keywordIncludes(value, ["concert", "gig", "music", "dj"])) return "Music Concert";
  if (keywordIncludes(value, ["festival", "food", "fair", "culinary"])) return "Food Festival";
  if (keywordIncludes(value, ["comedy", "stand up", "standup"])) return "Standup Comedy";
  if (keywordIncludes(value, ["college", "campus", "youth", "fashion"])) return "College Fest";
  if (keywordIncludes(value, ["sports", "tournament", "match", "gaming", "esports"])) return "Sports Tournament";
  if (keywordIncludes(value, ["tech", "startup", "conference", "summit", "hackathon", "meetup", "pitch", "expo"])) return "Tech Meetup";
  if (keywordIncludes(value, ["cricket", "screening", "watch party"])) return "Cricket Screening";
  if (keywordIncludes(value, ["cultural", "religious", "community", "heritage", "art", "charity"])) return "Religious/Cultural";

  return null;
}

export function mergeCanonicalBrandCategories(rawItems = []) {
  return [...new Set([...ML_BRAND_CATEGORIES, ...rawItems.map(canonicalMlBrandCategory).filter(Boolean)])];
}

export function mergeCanonicalEventTypes(rawItems = []) {
  return [...new Set([...ML_EVENT_TYPES, ...rawItems.map(canonicalMlEventType).filter(Boolean)])];
}
