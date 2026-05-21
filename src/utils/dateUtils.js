/**
 * Extract and format date portion to MM-DD-YYYY from an ISO timestamp
 * @param {string} timestamp - ISO timestamp string (e.g., "2026-05-20T18:44:45.000Z")
 * @returns {string} Date string (e.g., "05-20-2026") or empty string if invalid
 */
export const formatDateOnly = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'string') return '';
  
  // Extract the date part before the 'T'
  const dateMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return '';
  
  // Rearrange from YYYY-MM-DD to MM-DD-YYYY
  const [, year, month, day] = dateMatch;
  return `${month}-${day}-${year}`;
};
