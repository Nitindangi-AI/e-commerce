/**
 * Utility to format tracking numbers.
 * Prepend 'TRD-' if not present, and replace 'TRK-' with 'TRD-'.
 *
 * @param {string|number} num - The tracking number to format.
 * @returns {string} The formatted tracking number.
 */
export function formatTrackingNumber(num) {
  if (!num) return "TRD-PENDING";
  const str = String(num).trim();
  if (str.startsWith("TRD-")) return str;
  if (str.startsWith("TRK-")) {
    return `TRD-${str.slice(4)}`;
  }
  return `TRD-${str}`;
}
