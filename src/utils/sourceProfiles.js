import { deriveMediaOutlet } from "./sourceUtils";

const SOURCE_REGISTRY = [
  {
    displayName: "Reuters",
    names: ["reuters", "reuters world", "reuters business"],
    slug: "reuters",
    homepage: "https://www.reuters.com/",
    country: "United Kingdom / Global",
    founded: "1851",
    ownershipName: "Thomson Reuters",
    ownershipType: "Public company",
    ownershipSummary:
      "Reuters operates within Thomson Reuters, a publicly traded information and media business.",
    fundingModel:
      "Wire service, enterprise data products, licensing, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Global wire service focused on fast, attribution-heavy reporting across markets, politics, business, and international affairs.",
    methodologyNote:
      "Frequently used as a baseline reporting source because of its sourcing discipline and broad international footprint.",
  },
  {
    displayName: "BBC News",
    names: ["bbc", "bbc news"],
    slug: "bbc-news",
    homepage: "https://www.bbc.com/news",
    country: "United Kingdom",
    founded: "1922",
    ownershipName: "British Broadcasting Corporation",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Publicly funded broadcaster operating under a royal charter with editorial obligations and public-service remit.",
    fundingModel:
      "Primarily UK licence-fee funding with some commercial subsidiaries.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Public-service broadcaster with strong breaking-news reach, international bureaus, and a broad general-news agenda.",
    methodologyNote:
      "Useful for broad international framing and public-interest coverage, especially on global and UK stories.",
  },
  {
    displayName: "Associated Press",
    names: ["associated press", "ap", "ap news"],
    slug: "associated-press",
    homepage: "https://apnews.com/",
    country: "United States / Global",
    founded: "1846",
    ownershipName: "Associated Press member organizations",
    ownershipType: "Cooperative",
    ownershipSummary:
      "News cooperative owned by member news organizations rather than a single corporate parent.",
    fundingModel:
      "Licensing, syndication, and service agreements with member outlets and customers.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Wire service with strong original reporting, particularly in breaking news, politics, disasters, and sports.",
    methodologyNote:
      "Often a useful benchmark because its coverage is widely syndicated and built for downstream editorial reuse.",
  },
  {
    displayName: "NPR",
    names: ["npr", "national public radio"],
    slug: "npr",
    homepage: "https://www.npr.org/",
    country: "United States",
    founded: "1970",
    ownershipName: "National Public Radio",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Nonprofit newsroom supported by member stations, underwriting, donations, grants, and some public funding.",
    fundingModel:
      "Member support, sponsorship, grants, and limited institutional funding.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Public radio newsroom known for explanatory coverage, audio storytelling, and issue-driven domestic reporting.",
    methodologyNote:
      "Often adds depth and explanatory framing rather than pure wire-style brevity.",
  },
  {
    displayName: "New York Times",
    names: ["new york times", "nyt", "the new york times"],
    slug: "new-york-times",
    homepage: "https://www.nytimes.com/",
    country: "United States",
    founded: "1851",
    ownershipName: "The New York Times Company",
    ownershipType: "Public company",
    ownershipSummary:
      "Publicly traded publisher focused on subscriptions and related media products.",
    fundingModel:
      "Digital and print subscriptions, advertising, licensing, and consumer bundles.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "National and international newsroom with strong original reporting, investigations, and a large subscriber base.",
    methodologyNote:
      "Useful for original reporting depth and agenda-setting coverage, especially on US politics and international affairs.",
  },
  {
    displayName: "Washington Post",
    names: ["washington post", "the washington post"],
    slug: "washington-post",
    homepage: "https://www.washingtonpost.com/",
    country: "United States",
    founded: "1877",
    ownershipName: "Nash Holdings / Jeff Bezos",
    ownershipType: "Privately held",
    ownershipSummary:
      "Owned by Nash Holdings, the private investment vehicle of Jeff Bezos.",
    fundingModel:
      "Subscriptions, advertising, enterprise products, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "National newsroom with strong political, investigative, and policy coverage centered on Washington and federal institutions.",
    methodologyNote:
      "Particularly relevant on federal politics, policy, national security, and accountability reporting.",
  },
  {
    displayName: "CNN",
    names: ["cnn"],
    slug: "cnn",
    homepage: "https://www.cnn.com/",
    country: "United States / Global",
    founded: "1980",
    ownershipName: "Warner Bros. Discovery",
    ownershipType: "Public company division",
    ownershipSummary:
      "Cable and digital news network operating within Warner Bros. Discovery.",
    fundingModel:
      "Advertising, carriage fees, streaming products, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "24-hour news network with fast updates, live coverage infrastructure, and a large digital front page.",
    methodologyNote:
      "Often useful for speed and live framing, but headline tone can differ from wire-style outlets.",
  },
  {
    displayName: "Fox News",
    names: ["fox news"],
    slug: "fox-news",
    homepage: "https://www.foxnews.com/",
    country: "United States",
    founded: "1996",
    ownershipName: "Fox Corporation",
    ownershipType: "Public company division",
    ownershipSummary:
      "Cable and digital news division within publicly traded Fox Corporation.",
    fundingModel:
      "Advertising, carriage fees, digital traffic, and video monetization.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "Mixed factuality",
    description:
      "Large conservative-leaning television and digital network with strong audience reach across US political and cultural news.",
    methodologyNote:
      "Important for understanding how a major right-leaning audience is seeing a story, especially in US politics.",
  },
  {
    displayName: "The Guardian",
    names: ["the guardian", "guardian"],
    slug: "the-guardian",
    homepage: "https://www.theguardian.com/",
    country: "United Kingdom",
    founded: "1821",
    ownershipName: "Scott Trust Limited",
    ownershipType: "Trust-owned",
    ownershipSummary:
      "Owned by the Scott Trust, designed to preserve editorial independence rather than maximize shareholder returns.",
    fundingModel:
      "Reader contributions, memberships, advertising, and commercial partnerships.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Global news publisher with strong politics, climate, culture, and opinion coverage.",
    methodologyNote:
      "Useful for international framing, climate coverage, and a progressive editorial lens on public affairs.",
  },
  {
    displayName: "Wall Street Journal",
    names: ["wall street journal", "wsj", "the wall street journal"],
    slug: "wall-street-journal",
    homepage: "https://www.wsj.com/",
    country: "United States",
    founded: "1889",
    ownershipName: "News Corp",
    ownershipType: "Public company division",
    ownershipSummary:
      "Business and financial publisher operating within News Corp.",
    fundingModel:
      "Subscriptions, advertising, and enterprise business products.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "High factuality",
    description:
      "Business-focused newsroom with strong markets, policy, and corporate reporting.",
    methodologyNote:
      "Especially useful for business, finance, and policy stories where market framing matters.",
  },
  {
    displayName: "Politico",
    names: ["politico"],
    slug: "politico",
    homepage: "https://www.politico.com/",
    country: "United States / Europe",
    founded: "2007",
    ownershipName: "Axel Springer",
    ownershipType: "Privately held media group division",
    ownershipSummary: "Political and policy newsroom owned by Axel Springer.",
    fundingModel:
      "Advertising, subscriptions, and professional policy intelligence products.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Politics and policy newsroom focused on institutions, campaigns, legislative strategy, and insider reporting.",
    methodologyNote:
      "Useful for procedural detail, elite signaling, and institutional reporting rather than broad-population framing.",
  },
  {
    displayName: "Bloomberg",
    names: ["bloomberg", "bloomberg news"],
    slug: "bloomberg",
    homepage: "https://www.bloomberg.com/",
    country: "United States / Global",
    founded: "1990",
    ownershipName: "Bloomberg L.P.",
    ownershipType: "Privately held",
    ownershipSummary: "Privately held media and financial-data company.",
    fundingModel:
      "Terminal/data products, enterprise services, advertising, subscriptions, and syndication.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Business and markets newsroom with strong global financial, policy, and economic coverage.",
    methodologyNote:
      "Often strongest on market-moving detail, executive decisions, and data-backed economic reporting.",
  },
  {
    displayName: "CNBC",
    names: ["cnbc"],
    slug: "cnbc",
    homepage: "https://www.cnbc.com/",
    country: "United States / Global",
    founded: "1989",
    ownershipName: "NBCUniversal",
    ownershipType: "Public company division",
    ownershipSummary: "Business news network operating inside NBCUniversal.",
    fundingModel:
      "Advertising, carriage, digital traffic, and event sponsorship.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Markets-first business network with strong corporate, investor, and macroeconomic coverage.",
    methodologyNote:
      "Useful for live market reaction and business-news prioritization.",
  },
  {
    displayName: "Variety",
    names: ["variety"],
    slug: "variety",
    homepage: "https://variety.com/",
    country: "United States",
    founded: "1905",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Entertainment trade publication owned by Penske Media Corporation.",
    fundingModel:
      "Advertising, events, sponsorship, licensing, and subscriptions for trade audiences.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment trade outlet focused on film, television, streaming, talent, and awards coverage.",
    methodologyNote:
      "Best treated as an industry trade source rather than a general political news source.",
  },
  {
    displayName: "YouTube",
    names: ["youtube"],
    slug: "youtube",
    homepage: "https://www.youtube.com/",
    country: "United States / Global",
    founded: "2005",
    ownershipName: "Google / Alphabet",
    ownershipType: "Public company platform",
    ownershipSummary:
      "User-generated and publisher video platform owned by Alphabet through Google.",
    fundingModel:
      "Advertising, subscriptions, creator monetization, and commerce products.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Varies by channel",
    description:
      "Distribution platform rather than a single newsroom; reliability depends on the originating channel or publisher.",
    methodologyNote:
      "Treat platform-hosted video as a container. Verify the original publisher or channel behind the content.",
  },
  {
    displayName: "The Latest",
    names: ["the latest"],
    slug: "the-latest",
    homepage: "/",
    country: "United States",
    founded: "2026",
    ownershipName: "The Latest, Inc.",
    ownershipType: "Independent digital product",
    ownershipSummary:
      "Aggregation product that combines source routing, clustering, and clearly labeled generated fallback content.",
    fundingModel:
      "Advertising today; premium trust and research features are the intended long-term path.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "The Latest is a routing and synthesis layer, not the originating publisher for most live stories on the platform.",
    methodologyNote:
      "When The Latest generates fallback summaries or briefings, they should remain visibly labeled and link back to source context whenever possible.",
  },
];

export const PERSPECTIVE_METHODOLOGY = [
  {
    key: "source-map",
    title: "Source map",
    body: "The label comes from a known outlet pattern in our source registry. It reflects a broad editorial tendency, not the definitive truth value of a single story.",
  },
  {
    key: "ai-headline",
    title: "AI estimate",
    body: "The label is inferred from headline and summary framing when a strong source-history mapping is unavailable. Treat it as directional rather than authoritative.",
  },
  {
    key: "unclassified",
    title: "Unclassified",
    body: "We did not have enough confidence to assign a perspective bucket. That is preferable to overclaiming certainty where the signal is weak.",
  },
];

const normalizeKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const SOURCE_LOOKUP = SOURCE_REGISTRY.reduce((accumulator, profile) => {
  profile.names.forEach((name) => {
    accumulator[normalizeKey(name)] = profile;
  });
  accumulator[normalizeKey(profile.displayName)] = profile;
  return accumulator;
}, {});

const SOURCE_BY_SLUG = SOURCE_REGISTRY.reduce((accumulator, profile) => {
  accumulator[profile.slug] = profile;
  return accumulator;
}, {});

const FACTUALITY_SCORE_MAP = {
  "High factuality": 88,
  "Mixed to high factuality": 74,
  "Mixed factuality": 58,
  "Industry reporting": 68,
  "Varies by channel": 50,
  "Aggregation layer": 52,
  "Needs review": 30,
};

const OWNERSHIP_CLARITY_BONUS_MAP = {
  Cooperative: 5,
  "Nonprofit media organization": 6,
  "Public corporation": 5,
  "Trust-owned": 6,
  "Public company": 4,
  "Public company division": 3,
  "Privately held": 3,
  "Privately held media group division": 3,
  "Public company platform": 1,
  "Independent digital product": 2,
  Unclassified: 0,
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getTrustBand(score) {
  if (score >= 85) return "high";
  if (score >= 70) return "solid";
  if (score >= 55) return "caution";
  return "low";
}

function getTrustBandLabel(score) {
  const band = getTrustBand(score);
  if (band === "high") return "High trust context";
  if (band === "solid") return "Solid trust context";
  if (band === "caution") return "Use extra context";
  return "Needs verification";
}

function humanizeSourceSlug(value = "") {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function slugifySourceName(value = "") {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "source"
  );
}

export function getSourceProfile(sourceOrItem = "") {
  const derivedName =
    typeof sourceOrItem === "object" && sourceOrItem !== null
      ? deriveMediaOutlet(sourceOrItem)
      : deriveMediaOutlet(sourceOrItem);

  const matched = SOURCE_LOOKUP[normalizeKey(derivedName)];
  if (matched) {
    return {
      ...matched,
      sourceName: matched.displayName,
      href: `/sources/${matched.slug}`,
    };
  }

  const fallbackName = derivedName || "Unknown Source";
  const fallbackSlug = slugifySourceName(fallbackName);
  return {
    displayName: fallbackName,
    names: [fallbackName],
    slug: fallbackSlug,
    sourceName: fallbackName,
    href: `/sources/${fallbackSlug}`,
    homepage: "",
    country: "Unknown",
    founded: "Unknown",
    ownershipName: "Ownership not yet mapped",
    ownershipType: "Unclassified",
    ownershipSummary:
      "This outlet is not yet in the source registry, so ownership and editorial posture need manual review.",
    fundingModel: "Unknown",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Needs review",
    description:
      "The Latest has not yet built a full source profile for this outlet.",
    methodologyNote:
      "When a source is unmapped, treat perspective and ownership fields as incomplete until they are reviewed.",
  };
}

export function getTrustDescriptor(sourceOrItem = "") {
  const profile = getSourceProfile(sourceOrItem);
  const factualityBase = FACTUALITY_SCORE_MAP[profile.factualityLabel] ?? 35;
  const ownershipBonus =
    OWNERSHIP_CLARITY_BONUS_MAP[profile.ownershipType] ?? 0;
  const mappedPerspectiveBonus =
    profile.perspectiveKey && profile.perspectiveKey !== "unknown" ? 2 : 0;
  const methodologyBonus =
    profile.slug !== slugifySourceName(profile.displayName) ||
    SOURCE_BY_SLUG[profile.slug]
      ? 2
      : 0;
  const score = clampScore(
    factualityBase + ownershipBonus + mappedPerspectiveBonus + methodologyBonus,
  );

  return {
    score,
    band: getTrustBand(score),
    label: getTrustBandLabel(score),
    shortLabel: `Truth score ${score}`,
    rationale: `Source-level estimate based on factuality shorthand, ownership transparency, and how complete this source profile is. It is context for the outlet, not proof that any single article is true.`,
  };
}

export function getSourceProfileBySlug(sourceSlug = "") {
  const normalizedSlug = slugifySourceName(sourceSlug);
  const matched = SOURCE_BY_SLUG[normalizedSlug];
  if (matched) {
    return {
      ...matched,
      sourceName: matched.displayName,
      href: `/sources/${matched.slug}`,
    };
  }

  return getSourceProfile(humanizeSourceSlug(normalizedSlug));
}

export function getSourceProfileHref(sourceOrItem = "") {
  return getSourceProfile(sourceOrItem).href;
}
