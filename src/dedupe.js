/** Case/whitespace-insensitive key so "Holtin" and " holtin " are the same hotel. */
const normalizeName = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Collapse offers to one per hotel name, keeping the cheapest.
 * Tie-break (equal price): higher commission wins. Result sorted by price asc.
 * Pure + deterministic, so it is safe to run inside a Temporal workflow.
 */
function selectBestOffers(offers) {
  const best = new Map();
  for (const offer of offers) {
    const key = normalizeName(offer.name);
    const current = best.get(key);
    if (
      !current ||
      offer.price < current.price ||
      (offer.price === current.price && offer.commissionPct > current.commissionPct)
    ) {
      best.set(key, offer);
    }
  }
  return [...best.values()].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

module.exports = { normalizeName, selectBestOffers };
