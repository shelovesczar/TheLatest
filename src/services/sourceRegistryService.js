import { slugifySourceName } from "../utils/sourceProfiles";

const SOURCE_REGISTRY_ENDPOINT = "/.netlify/functions/sources";

let sourceRegistryCache = null;
let sourceRegistryPromise = null;

function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getRegistryCompletenessScore(record = {}) {
  let score = 0;

  if (record.active !== false) score += 1;
  if (String(record.ownershipName || "").trim()) score += 3;
  if (String(record.ownershipType || "").trim()) score += 2;
  if (String(record.perspectiveKey || "").trim()) score += 2;
  if (String(record.perspectiveLabel || "").trim()) score += 2;
  if (toFiniteNumber(record.trustScore) !== null) score += 3;
  if (String(record.notes || "").trim()) score += 1;
  if (String(record.updatedAt || "").trim()) score += 1;

  return score;
}

function buildSourceSlug(value = "") {
  return slugifySourceName(value || "unknown-source");
}

export function choosePreferredRegistryRecord(records = []) {
  return (Array.isArray(records) ? records : []).reduce((best, current) => {
    if (!current) return best;
    if (!best) return current;

    const bestScore = getRegistryCompletenessScore(best);
    const currentScore = getRegistryCompletenessScore(current);

    if (currentScore !== bestScore) {
      return currentScore > bestScore ? current : best;
    }

    return String(current.updatedAt || "") > String(best.updatedAt || "")
      ? current
      : best;
  }, null);
}

export function findRegistryRecord(records = [], sourceOrProfile = "") {
  const sourceName =
    typeof sourceOrProfile === "object" && sourceOrProfile !== null
      ? sourceOrProfile.displayName ||
        sourceOrProfile.sourceName ||
        sourceOrProfile.source ||
        ""
      : String(sourceOrProfile || "");

  const sourceSlug =
    typeof sourceOrProfile === "object" && sourceOrProfile !== null
      ? sourceOrProfile.slug || buildSourceSlug(sourceName)
      : buildSourceSlug(sourceName);

  const matches = (Array.isArray(records) ? records : []).filter((record) => {
    const recordSlug = buildSourceSlug(
      record?.source || record?.displayName || "",
    );
    return recordSlug === sourceSlug;
  });

  return choosePreferredRegistryRecord(matches);
}

export function mergeSourceProfileWithRegistry(profile = {}, record = null) {
  if (!record) {
    return profile;
  }

  const trustScore = toFiniteNumber(record.trustScore);

  return {
    ...profile,
    ownershipName:
      String(record.ownershipName || "").trim() || profile.ownershipName,
    ownershipType:
      String(record.ownershipType || "").trim() || profile.ownershipType,
    perspectiveKey:
      String(record.perspectiveKey || "").trim() || profile.perspectiveKey,
    perspectiveLabel:
      String(record.perspectiveLabel || "").trim() || profile.perspectiveLabel,
    trustScore: trustScore ?? profile.trustScore ?? null,
    registryNotes: String(record.notes || "").trim() || "",
    registryUpdatedAt: String(record.updatedAt || "").trim() || "",
    registrySourceId: String(record.id || "").trim() || "",
  };
}

export async function getSourceRegistry(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh && Array.isArray(sourceRegistryCache)) {
    return sourceRegistryCache;
  }

  if (!forceRefresh && sourceRegistryPromise) {
    return sourceRegistryPromise;
  }

  sourceRegistryPromise = fetch(SOURCE_REGISTRY_ENDPOINT)
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load source registry.");
      }

      sourceRegistryCache = Array.isArray(payload?.sources)
        ? payload.sources
        : [];
      return sourceRegistryCache;
    })
    .catch((error) => {
      if (Array.isArray(sourceRegistryCache)) {
        return sourceRegistryCache;
      }

      throw error;
    })
    .finally(() => {
      sourceRegistryPromise = null;
    });

  return sourceRegistryPromise;
}
