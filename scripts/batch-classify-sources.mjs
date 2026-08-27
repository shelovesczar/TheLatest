// Researches and proposes registry entries for every outlet
// scripts/audit-unclassified-sources.mjs finds missing from
// src/utils/sourceProfiles.js. Three passes, cheapest/safest first:
//
//   1. Alias detection (no AI, no cost): many "gaps" are just a section feed
//      of an outlet that's already curated (e.g. "New York Times Politics"
//      isn't a new outlet, it's a missing alias on the existing NYT entry).
//   2. Aggregator-construct exclusion: our own RSS bundle feeds aren't
//      editorial outlets and shouldn't get a political-bias label at all.
//   3. AI research for what's left, using the same ANTHROPIC_API_KEY path
//      and .env fallback every other function in this repo already uses.
//
// This does NOT write to sourceProfiles.js. It writes a structured report
// for human review, matching how the 84->95 registry expansion was actually
// done earlier this session (researched in batches, then explicitly added).
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { getSourceProfile } from "../src/utils/sourceProfiles.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { RSS_FEEDS } = require(
  path.resolve(__dirname, "../netlify/functions/rss-aggregator-impl.cjs"),
);

const REPORT_PATH =
  process.argv[2] ||
  path.resolve(__dirname, "../.tmp/source-classification-report.md");

const SECTION_SUFFIXES = [
  "Politics",
  "Opinion",
  "Opinions",
  "Sports",
  "US",
  "Video",
  "TV",
  "Books",
  "Culture",
  "Business",
  "Tech",
  "World",
  "Travel",
  "Health",
  "Style",
  "Global 3000",
];

const AGGREGATOR_CONSTRUCT_PATTERN = /\bbundle\b|custom video feed/i;

function isPlaceholderProfile(profile = {}) {
  return (
    String(profile.perspectiveKey || "").trim() === "unknown" ||
    String(profile.ownershipName || "").trim() === "Ownership not yet mapped" ||
    String(profile.factualityLabel || "").trim() === "Needs review"
  );
}

function findGaps() {
  const bySourceName = new Map();

  Object.entries(RSS_FEEDS).forEach(([feedKey, feeds]) => {
    (Array.isArray(feeds) ? feeds : []).forEach((feed) => {
      const name = String(feed?.source || "").trim();
      if (!name) return;
      if (!bySourceName.has(name)) {
        bySourceName.set(name, { source: name, feedKeys: new Set() });
      }
      bySourceName.get(name).feedKeys.add(feedKey);
    });
  });

  return Array.from(bySourceName.values())
    .map((entry) => ({ source: entry.source, feedKeys: Array.from(entry.feedKeys) }))
    .filter((entry) => isPlaceholderProfile(getSourceProfile(entry.source)))
    .sort((a, b) => a.source.localeCompare(b.source));
}

function detectAliasCandidate(sourceName) {
  for (const suffix of SECTION_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s+${suffix}$`, "i");
    if (!suffixPattern.test(sourceName)) continue;

    const stripped = sourceName.replace(suffixPattern, "").trim();
    if (!stripped) continue;

    const profile = getSourceProfile(stripped);
    if (!isPlaceholderProfile(profile)) {
      return { baseOutlet: profile.displayName, strippedName: stripped };
    }
  }
  return null;
}

let localEnvCache = null;
function readLocalEnvValue(name) {
  if (localEnvCache === null) {
    localEnvCache = {};
    try {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../.env"),
        "utf8",
      );
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
        const i = trimmed.indexOf("=");
        localEnvCache[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
      });
    } catch {
      // no .env available
    }
  }
  return String(localEnvCache[name] || process.env[name] || "").trim();
}

async function mapWithConcurrency(items, worker, concurrency = 3) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runNext() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext),
  );
  return results;
}

const CLASSIFY_PROMPT = (sourceName, feedKeys) => `You are helping curate a news-outlet source registry that already follows a specific methodology: match AllSides / Ad Fontes Media / Media Bias Fact Check tracker consensus, prefer the plain established label over inventing a new nuanced one, and explicitly flag disputed or low-confidence cases rather than guessing confidently.

Outlet to classify: "${sourceName}"
It is configured under these RSS feed categories on the site: ${feedKeys.join(", ")}

Many outlets in this registry (lifestyle, health, sports-stats, arts/culture, science, food, travel publications) have NO meaningful political lean and should not be forced into a left/center/right label -- AllSides/MBFC don't rate these either. Only assign a real perspectiveKey if the outlet does general news/politics/opinion coverage where a lean is actually meaningful and tracker-rated.

Return JSON only, in exactly this shape:
{
  "isPolitical": true or false,
  "displayName": "canonical outlet name",
  "homepage": "https://... or empty string if unknown",
  "country": "country or empty string",
  "ownershipName": "best-known parent company/publisher, or empty string if unknown",
  "ownershipType": "one of: Public company division, Private company, Nonprofit media organization, Independent, Public broadcaster, Government-funded international broadcaster, Cooperative, or empty string if unknown",
  "perspectiveKey": "left, center, right, or unknown (use unknown if isPolitical is false or genuinely unrated)",
  "perspectiveLabel": "Left, Left-Center, Center, Right-Center, Right, or Unclassified",
  "factualityLabel": "one of: High factuality, Mixed to high factuality, Mixed factuality, Industry reporting, Varies by channel, Aggregation layer, Needs review",
  "description": "one sentence describing the outlet's coverage focus and editorial voice",
  "methodologyNote": "one sentence citing the tracker-consensus reasoning, or noting why no political lean applies",
  "confidence": "high, medium, or low",
  "needsManualReview": true or false (true if disputed, obscure, or you are not confident)
}

No markdown, no prose outside the JSON.`;

async function classifyWithAnthropicOnce(sourceName, feedKeys, apiKey, model) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [
        { role: "user", content: CLASSIFY_PROMPT(sourceName, feedKeys) },
      ],
    }),
  });

  if (!response.ok) {
    return { error: `Anthropic request failed: ${response.status}` };
  }

  const payload = await response.json();
  const text = (payload?.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) return { error: "No text in Anthropic response" };

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { error: "Anthropic response was not valid JSON", raw: text };
  }
}

async function classifyWithAnthropic(sourceName, feedKeys, attempts = 3) {
  const apiKey = readLocalEnvValue("ANTHROPIC_API_KEY");
  if (!apiKey) return { error: "ANTHROPIC_API_KEY not configured" };

  const model = readLocalEnvValue("ANTHROPIC_SUMMARY_MODEL") || "claude-sonnet-5";

  let lastResult = { error: "No attempts made" };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastResult = await classifyWithAnthropicOnce(
        sourceName,
        feedKeys,
        apiKey,
        model,
      );
    } catch (error) {
      lastResult = { error: error.message || "Unknown error" };
    }

    // Malformed-JSON responses are usually transient (extra prose, a stray
    // stop mid-object) -- retry those. A missing key or hard HTTP error
    // won't be fixed by retrying, so stop immediately for those.
    if (!lastResult.error || lastResult.error === "Anthropic request failed") {
      return lastResult;
    }
    if (!String(lastResult.error).includes("not valid JSON")) {
      return lastResult;
    }
  }
  return lastResult;
}

function formatProposedEntry(sourceName, result) {
  // Non-political outlets still get a real entry (ownership/factuality/
  // description populated for real) rather than staying a placeholder --
  // perspectiveKey is "unknown" either way since the registry has no
  // distinct "not applicable" bucket today (would need a small follow-up
  // to the perspective UI to display differently from a truly unresearched
  // source; flagged in the report, not silently built here).
  const names = [sourceName.toLowerCase(), result.displayName?.toLowerCase()].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );

  return `  {
    displayName: ${JSON.stringify(result.displayName || sourceName)},
    names: ${JSON.stringify(names)},
    slug: ${JSON.stringify((result.displayName || sourceName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))},
    homepage: ${JSON.stringify(result.homepage || "")},
    country: ${JSON.stringify(result.country || "Unknown")},
    ownershipName: ${JSON.stringify(result.ownershipName || "")},
    ownershipType: ${JSON.stringify(result.ownershipType || "")},
    ownershipSummary: "",
    fundingModel: "",
    perspectiveKey: ${JSON.stringify(result.isPolitical ? result.perspectiveKey || "unknown" : "unknown")},
    perspectiveLabel: ${JSON.stringify(result.isPolitical ? result.perspectiveLabel || "Unclassified" : "Not applicable")},
    factualityLabel: ${JSON.stringify(result.factualityLabel || "Industry reporting")},
    description: ${JSON.stringify(result.description || "")},
    methodologyNote: ${JSON.stringify(result.isPolitical ? result.methodologyNote || "" : result.methodologyNote || "No political lean applies; not rated by AllSides/Ad Fontes/MBFC.")},
  },`;
}

async function main() {
  const gaps = findGaps();
  console.log(`Found ${gaps.length} gaps to process.\n`);

  const aliasCandidates = [];
  const excluded = [];
  const genuine = [];

  gaps.forEach((gap) => {
    if (AGGREGATOR_CONSTRUCT_PATTERN.test(gap.source)) {
      excluded.push(gap);
      return;
    }
    const alias = detectAliasCandidate(gap.source);
    if (alias) {
      aliasCandidates.push({ ...gap, ...alias });
      return;
    }
    genuine.push(gap);
  });

  console.log(`Pass 1 (alias detection, no AI): ${aliasCandidates.length} resolved`);
  console.log(`Pass 2 (aggregator constructs excluded): ${excluded.length}`);
  console.log(`Pass 3 (AI research needed): ${genuine.length}\n`);

  console.log("Running AI research pass...");
  const classified = await mapWithConcurrency(
    genuine,
    async (gap) => {
      const result = await classifyWithAnthropic(gap.source, gap.feedKeys);
      console.log(
        `  ${gap.source} -> ${result.error ? `ERROR: ${result.error}` : result.isPolitical ? `${result.perspectiveLabel} (${result.confidence}${result.needsManualReview ? ", FLAGGED FOR REVIEW" : ""})` : "non-political"}`,
      );
      return { ...gap, result };
    },
    3,
  );

  const lines = [];
  lines.push(`# Source Classification Report`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total gaps: ${gaps.length}\n`);

  lines.push(`## Alias fixes (add to existing profile's \`names\` array, no new entry)`);
  lines.push(
    aliasCandidates.length === 0
      ? "None."
      : aliasCandidates
          .map(
            (a) =>
              `- **${a.source}** -> add \`"${a.source.toLowerCase()}"\` to **${a.baseOutlet}**'s \`names\` array`,
          )
          .join("\n"),
  );

  lines.push(`\n## Excluded (aggregator constructs, not real outlets)`);
  lines.push(
    excluded.length === 0
      ? "None."
      : excluded.map((e) => `- ${e.source}`).join("\n"),
  );

  const errors = classified.filter((c) => c.result.error);
  const needsReview = classified.filter(
    (c) => !c.result.error && c.result.needsManualReview,
  );
  const nonPolitical = classified.filter(
    (c) => !c.result.error && c.result.isPolitical === false,
  );
  const readyToAdd = classified.filter(
    (c) => !c.result.error && c.result.isPolitical && !c.result.needsManualReview,
  );

  lines.push(`\n## AI research failures (${errors.length}) -- rerun or classify manually`);
  lines.push(
    errors.length === 0
      ? "None."
      : errors.map((e) => `- ${e.source}: ${e.result.error}`).join("\n"),
  );

  lines.push(`\n## Flagged for manual review (${needsReview.length})`);
  lines.push(
    needsReview.length === 0
      ? "None."
      : needsReview
          .map(
            (c) =>
              `- **${c.source}**: ${c.result.perspectiveLabel}, confidence ${c.result.confidence} -- ${c.result.methodologyNote || ""}`,
          )
          .join("\n"),
  );

  lines.push(`\n## Non-political outlets (${nonPolitical.length}) -- no lean applies`);
  lines.push(
    nonPolitical.length === 0
      ? "None."
      : nonPolitical.map((c) => `- ${c.source}: ${c.result.description || ""}`).join("\n"),
  );

  lines.push(`\n## Ready-to-review new registry entries (${readyToAdd.length + nonPolitical.length})`);
  lines.push("Paste into `src/utils/sourceProfiles.js`'s `SOURCE_REGISTRY` array after review.\n");
  lines.push("```js");
  [...readyToAdd, ...nonPolitical].forEach((c) => {
    lines.push(formatProposedEntry(c.source, c.result));
  });
  lines.push("```");

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(
    `Summary: ${aliasCandidates.length} alias fixes, ${excluded.length} excluded, ${readyToAdd.length + nonPolitical.length} ready for review, ${needsReview.length} flagged, ${errors.length} errors.`,
  );
}

main().catch((error) => {
  console.error("Batch classification failed:", error);
  process.exit(1);
});
