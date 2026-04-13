const SUPPORTED_ML_BRAND_TYPES = [
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

const SUPPORTED_ML_EVENT_TYPES = [
  "College Fest",
  "Cricket Screening",
  "Food Festival",
  "Music Concert",
  "Religious/Cultural",
  "Sports Tournament",
  "Standup Comedy",
  "Tech Meetup",
];

const SUPPORTED_ML_CITIES = [
  "Bhopal",
  "Burhanpur",
  "Chhindwara",
  "Damoh",
  "Dewas",
  "Gwalior",
  "Indore",
  "Jabalpur",
  "Katni",
  "Khandwa",
  "Khargone",
  "Mandsaur",
  "Morena",
  "Narmadapuram",
  "Neemuch",
  "Ratlam",
  "Rewa",
  "Sagar",
  "Satna",
  "Sehore",
  "Seoni",
  "Shivpuri",
  "Singrauli",
  "Ujjain",
  "Vidisha",
];

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (items) => [...new Set(items.filter(Boolean))];

const EVENT_MAP = {
  "music concert": "Music Concert",
  "concert": "Music Concert",
  "live music": "Music Concert",
  "food festival": "Food Festival",
  "food fair": "Food Festival",
  "comedy show": "Standup Comedy",
  "stand up comedy": "Standup Comedy",
  "standup comedy": "Standup Comedy",
  "cultural festival": "Religious/Cultural",
  "religious festival": "Religious/Cultural",
  "charity gala": "Religious/Cultural",
  "art exhibition": "Religious/Cultural",
  "sports event": "Sports Tournament",
  "sports tournament": "Sports Tournament",
  "gaming tournament": "Sports Tournament",
  "esports tournament": "Sports Tournament",
  "hackathon": "Tech Meetup",
  "startup pitch": "Tech Meetup",
  "tech conference": "Tech Meetup",
  "business conference": "Tech Meetup",
  "meetup": "Tech Meetup",
  "fashion show": "College Fest",
  "college fest": "College Fest",
  "cricket screening": "Cricket Screening",
  "watch party": "Cricket Screening",
};

const BRAND_MAP = {
  automobile: "Automobile",
  automotive: "Automobile",
  transport: "Automobile",
  telecom: "Telecom",
  technology: "Telecom",
  tech: "Telecom",
  software: "Telecom",
  electronics: "Telecom",
  entertainment: "Telecom",
  media: "Telecom",
  streaming: "Telecom",
  "real estate": "Real Estate",
  property: "Real Estate",
  beverage: "Beverage",
  beverages: "Beverage",
  drink: "Beverage",
  drinks: "Beverage",
  "food beverage": "FMCG",
  "food and beverage": "FMCG",
  food: "FMCG",
  grocery: "FMCG",
  fmcg: "FMCG",
  retail: "Local Retail",
  "local retail": "Local Retail",
  ecommerce: "Local Retail",
  "e commerce": "Local Retail",
  marketplace: "Local Retail",
  travel: "Local Retail",
  tourism: "Local Retail",
  education: "Edtech",
  edtech: "Edtech",
  learning: "Edtech",
  fintech: "Fintech",
  finance: "Fintech",
  banking: "Fintech",
  payments: "Fintech",
  apparel: "Local Retail",
  fashion: "Local Retail",
  clothing: "Local Retail",
  fitness: "Local Retail",
  sports: "Local Retail",
  wellness: "Beauty/Personal Care",
  beauty: "Beauty/Personal Care",
  skincare: "Beauty/Personal Care",
  cosmetics: "Beauty/Personal Care",
  healthcare: "Beauty/Personal Care",
  health: "Beauty/Personal Care",
  personal: "Beauty/Personal Care",
};

const keywordIncludes = (haystack, needles) => needles.some((needle) => haystack.includes(needle));

function canonicalMlCity(rawCity = "") {
  const normalizedCity = normalize(rawCity);

  if (!normalizedCity) return "Indore";

  const exact = SUPPORTED_ML_CITIES.find((city) => normalize(city) === normalizedCity);
  if (exact) return exact;

  const partial = SUPPORTED_ML_CITIES.find((city) => {
    const normalizedSupportedCity = normalize(city);
    return normalizedCity.includes(normalizedSupportedCity) || normalizedSupportedCity.includes(normalizedCity);
  });

  return partial || String(rawCity).trim();
}

function canonicalMlEventType(rawEventType = "", eventDescription = "") {
  const normalizedEventType = normalize(rawEventType);
  const lookupHit = EVENT_MAP[normalizedEventType];
  if (lookupHit) return lookupHit;

  const eventBlob = normalize(`${rawEventType} ${eventDescription}`);

  if (keywordIncludes(eventBlob, ["concert", "gig", "music", "dj"])) return "Music Concert";
  if (keywordIncludes(eventBlob, ["festival", "food", "fair", "culinary"])) return "Food Festival";
  if (keywordIncludes(eventBlob, ["comedy", "stand up", "standup"])) return "Standup Comedy";
  if (keywordIncludes(eventBlob, ["college", "campus", "youth", "fashion"])) return "College Fest";
  if (keywordIncludes(eventBlob, ["sports", "tournament", "match", "gaming", "esports"])) return "Sports Tournament";
  if (keywordIncludes(eventBlob, ["tech", "startup", "conference", "summit", "hackathon", "meetup", "pitch", "expo"])) return "Tech Meetup";
  if (keywordIncludes(eventBlob, ["cricket", "screening", "watch party"])) return "Cricket Screening";
  if (keywordIncludes(eventBlob, ["cultural", "religious", "community", "heritage", "art", "charity"])) return "Religious/Cultural";

  return "Religious/Cultural";
}

function canonicalMlBrandType(rawBrandType = "", brandDescription = "", brandName = "") {
  const normalizedBrandType = normalize(rawBrandType);
  const lookupHit = BRAND_MAP[normalizedBrandType];
  if (lookupHit) return lookupHit;

  const brandBlob = normalize(`${rawBrandType} ${brandDescription} ${brandName}`);

  if (keywordIncludes(brandBlob, ["finance", "bank", "banking", "payment", "wallet", "insurance", "loan", "credit"])) return "Fintech";
  if (keywordIncludes(brandBlob, ["beauty", "wellness", "health", "personal care", "cosmetic", "skin", "spa", "fitness care"])) return "Beauty/Personal Care";
  if (keywordIncludes(brandBlob, ["fashion", "apparel", "clothing", "sportswear", "athleisure", "fitness"])) return "Local Retail";
  if (keywordIncludes(brandBlob, ["beverage", "drink", "energy drink", "juice", "cola", "water"])) return "Beverage";
  if (keywordIncludes(brandBlob, ["food", "snack", "grocery", "fmcg", "consumer goods", "household"])) return "FMCG";
  if (keywordIncludes(brandBlob, ["education", "edtech", "learning", "course", "academy", "training"])) return "Edtech";
  if (keywordIncludes(brandBlob, ["real estate", "property", "builder", "housing", "residential"])) return "Real Estate";
  if (keywordIncludes(brandBlob, ["automobile", "car", "bike", "ev", "vehicle", "mobility"])) return "Automobile";
  if (keywordIncludes(brandBlob, ["technology", "tech", "telecom", "software", "electronics", "media", "streaming", "entertainment", "digital"])) return "Telecom";
  if (keywordIncludes(brandBlob, ["retail", "e commerce", "ecommerce", "marketplace", "travel", "tourism", "hotel", "restaurant"])) return "Local Retail";

  return "Local Retail";
}

function mergeCanonicalBrandTypes(rawItems = []) {
  return unique([...
    SUPPORTED_ML_BRAND_TYPES,
    ...rawItems.map((item) => canonicalMlBrandType(item)),
  ]);
}

function mergeCanonicalEventTypes(rawItems = []) {
  return unique([...
    SUPPORTED_ML_EVENT_TYPES,
    ...rawItems.map((item) => canonicalMlEventType(item)),
  ]);
}

module.exports = {
  SUPPORTED_ML_BRAND_TYPES,
  SUPPORTED_ML_EVENT_TYPES,
  SUPPORTED_ML_CITIES,
  canonicalMlCity,
  canonicalMlEventType,
  canonicalMlBrandType,
  mergeCanonicalBrandTypes,
  mergeCanonicalEventTypes,
};
