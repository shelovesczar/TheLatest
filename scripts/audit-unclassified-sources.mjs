// Static audit: every distinct source name configured in RSS_FEEDS, cross
// referenced against the curated registry in src/utils/sourceProfiles.js.
// Unlike audit-source-governance.mjs (which audits the admin-managed source
// records via a live server endpoint), this runs standalone against the
// actual configured feed list -- no server required -- so it can be re-run
// any time new feeds are added to find real "Unclassified" gaps directly.
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import { getSourceProfile } from "../src/utils/sourceProfiles.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { RSS_FEEDS } = require(
  path.resolve(__dirname, "../netlify/functions/rss-aggregator-impl.cjs"),
);

function isPlaceholderProfile(profile = {}) {
  return (
    String(profile.perspectiveKey || "").trim() === "unknown" ||
    String(profile.ownershipName || "").trim() === "Ownership not yet mapped" ||
    String(profile.factualityLabel || "").trim() === "Needs review"
  );
}

function main() {
  const bySourceName = new Map();

  Object.entries(RSS_FEEDS).forEach(([feedKey, feeds]) => {
    (Array.isArray(feeds) ? feeds : []).forEach((feed) => {
      const name = String(feed?.source || "").trim();
      if (!name) return;

      if (!bySourceName.has(name)) {
        bySourceName.set(name, {
          source: name,
          feedKeys: new Set(),
          disabledEverywhere: true,
          urls: [],
        });
      }
      const entry = bySourceName.get(name);
      entry.feedKeys.add(feedKey);
      entry.disabledEverywhere =
        entry.disabledEverywhere && feed?.disabled === true;
      entry.urls.push(feed?.url || "");
    });
  });

  const allSources = Array.from(bySourceName.values()).sort((a, b) =>
    a.source.localeCompare(b.source),
  );

  const results = allSources.map((entry) => {
    const profile = getSourceProfile(entry.source);
    return {
      source: entry.source,
      feedKeys: Array.from(entry.feedKeys).sort(),
      disabledEverywhere: entry.disabledEverywhere,
      sampleUrl: entry.urls[0] || "",
      resolvedDisplayName: profile.displayName,
      curated: !isPlaceholderProfile(profile),
    };
  });

  const curated = results.filter((r) => r.curated);
  const gaps = results.filter((r) => !r.curated);
  const activeGaps = gaps.filter((r) => !r.disabledEverywhere);

  console.log(`Total distinct configured sources: ${results.length}`);
  console.log(`Curated (real profile): ${curated.length}`);
  console.log(`Gaps (placeholder/unclassified): ${gaps.length}`);
  console.log(
    `  of which actively fetched (not disabled everywhere): ${activeGaps.length}`,
  );

  if (gaps.length > 0) {
    console.log("\nGap list (source -> feedKeys):");
    gaps.forEach((row) => {
      const flag = row.disabledEverywhere ? " [disabled]" : "";
      console.log(`- ${row.source} [${row.feedKeys.join(", ")}]${flag}`);
    });
    console.log(
      "\nRun `node scripts/batch-classify-sources.mjs` to research and propose",
      "registry entries for these gaps (writes a review report, does not",
      "modify sourceProfiles.js directly).",
    );
  }
}

main();
