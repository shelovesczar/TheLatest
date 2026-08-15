import { getSourceProfile } from "../src/utils/sourceProfiles.js";

const rawBaseUrl =
  process.argv[2] ||
  process.env.SOURCE_AUDIT_BASE_URL ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_PRIME_URL ||
  process.env.URL ||
  "";
const strict = process.argv.includes("--strict");

if (!rawBaseUrl) {
  console.error(
    "Provide a base URL as the first argument or set SOURCE_AUDIT_BASE_URL.",
  );
  process.exit(1);
}

const baseUrl = String(rawBaseUrl).replace(/\/$/, "");

function resolveUrl(pathname) {
  return `${baseUrl}${pathname}`;
}

async function requestJson(pathname) {
  const response = await fetch(resolveUrl(pathname));
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${pathname} did not return JSON.`);
  }

  return JSON.parse(text);
}

function classifyGaps(source = {}) {
  const gaps = [];

  if (!source.ownershipName || !source.ownershipType) {
    gaps.push("ownership");
  }
  if (!source.perspectiveKey || !source.perspectiveLabel) {
    gaps.push("perspective");
  }
  const hasExplicitTrust =
    source.trustScore !== null &&
    source.trustScore !== undefined &&
    Number.isFinite(Number(source.trustScore));
  const hasSeededTrustContext = Boolean(
    String(source.factualityLabel || "").trim(),
  );
  if (!hasExplicitTrust && !hasSeededTrustContext) {
    gaps.push("trust");
  }

  return gaps;
}

function classifyResolvedProfile(profile = {}) {
  const placeholderOwnership =
    String(profile.ownershipName || "").trim() === "Ownership not yet mapped";
  const placeholderPerspective =
    String(profile.perspectiveLabel || "").trim() === "Unclassified";
  const placeholderTrust =
    String(profile.factualityLabel || "").trim() === "Needs review";

  return {
    governed: Boolean(String(profile.displayName || "").trim()),
    curated:
      !placeholderOwnership && !placeholderPerspective && !placeholderTrust,
  };
}

async function main() {
  console.log(`Auditing managed source governance at ${baseUrl}`);

  const payload = await requestJson("/.netlify/functions/sources");
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];

  if (sources.length === 0) {
    throw new Error("No managed sources were returned.");
  }

  const rawRows = sources
    .map((source) => ({
      ...source,
      gaps: classifyGaps(source),
    }))
    .filter((source) => source.gaps.length > 0)
    .sort(
      (left, right) =>
        left.gaps.length - right.gaps.length ||
        String(left.source || "").localeCompare(String(right.source || "")),
    );

  const missingOwnership = rawRows.filter((row) =>
    row.gaps.includes("ownership"),
  ).length;
  const missingPerspective = rawRows.filter((row) =>
    row.gaps.includes("perspective"),
  ).length;
  const missingTrust = rawRows.filter((row) =>
    row.gaps.includes("trust"),
  ).length;

  const resolvedRows = sources.map((source) => {
    const profile = getSourceProfile(source);
    const status = classifyResolvedProfile(profile);
    return {
      ...source,
      profile,
      ...status,
    };
  });

  const governedCount = resolvedRows.filter((row) => row.governed).length;
  const curatedRows = resolvedRows.filter((row) => row.curated);
  const curationQueue = resolvedRows
    .filter((row) => !row.curated)
    .sort(
      (left, right) =>
        String(right.priority || "").localeCompare(
          String(left.priority || ""),
        ) ||
        String(left.feedKey || "").localeCompare(String(right.feedKey || "")) ||
        String(left.source || "").localeCompare(String(right.source || "")),
    );

  console.log(`Total managed sources: ${sources.length}`);
  console.log(
    `Resolved governance coverage: ${governedCount}/${sources.length}`,
  );
  console.log(
    `Resolved curated coverage: ${curatedRows.length}/${sources.length}`,
  );
  console.log(
    `Remaining sources needing deeper curation: ${curationQueue.length}`,
  );
  console.log(`Sources missing ownership metadata: ${missingOwnership}`);
  console.log(`Sources missing perspective metadata: ${missingPerspective}`);
  console.log(`Sources missing trust metadata: ${missingTrust}`);

  if (rawRows.length > 0) {
    console.log("\nTop managed records with sparse stored metadata:");
    rawRows.slice(0, 20).forEach((row) => {
      console.log(
        `- [${row.feedKey}] ${row.source} :: missing ${row.gaps.join(", ")}`,
      );
    });
  }

  if (curationQueue.length > 0) {
    console.log("\nTop sources still needing deeper curation:");
    curationQueue.slice(0, 20).forEach((row) => {
      console.log(
        `- [${row.feedKey}] ${row.source} -> ${row.profile.displayName} (${row.profile.factualityLabel})`,
      );
    });
  }

  if (strict && governedCount !== sources.length) {
    console.error(
      `\nSource governance audit failed because some sources did not resolve to any governance profile.`,
    );
    process.exit(1);
  }

  console.log("\nSource governance audit complete.");
}

main().catch((error) => {
  console.error(`Source governance audit failed: ${error.message}`);
  process.exit(1);
});
