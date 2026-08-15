const toTextValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toTextValue).find(Boolean) || "";
  if (typeof value === "object" && typeof value._ === "string") {
    return value._.trim();
  }
  return "";
};

export const resolvePublishedTimestamp = (item = {}) => {
  const candidates = [
    item?.publishedAt,
    item?.timestamp,
    item?.pubDate,
    item?.isoDate,
    item?.date,
    item?.time,
  ];

  for (const candidate of candidates) {
    const text = toTextValue(candidate);
    if (!text) continue;

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
  }

  return "";
};

/**
 * Extract and format date portion to MM-DD-YYYY from a publish timestamp-like value.
 * @param {string|object} timestamp - Timestamp or date-like value
 * @returns {string} Date string (e.g., "05-20-2026") or empty string if invalid
 */
export const formatDateOnly = (timestamp) => {
  const resolved = resolvePublishedTimestamp({ publishedAt: timestamp });
  if (!resolved) return "";

  const dateMatch = resolved.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return "";

  const [, year, month, day] = dateMatch;
  return `${month}-${day}-${year}`;
};

export const formatPublishedDate = (item = {}) =>
  formatDateOnly(resolvePublishedTimestamp(item));
