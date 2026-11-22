const { Context } = require('@temporalio/activity');
const config = require('../config');
const { saveHotels } = require('../hotelStore');
const { createLogger } = require('../logger');

const log = createLogger('activities');

const SUPPLIER_PATH = {
  'Supplier A': '/supplierA/hotels',
  'Supplier B': '/supplierB/hotels',
};

const isValid = (h) =>
  h && typeof h.name === 'string' && h.name.trim() !== '' && Number.isFinite(h.price) && h.price >= 0;

/** Calls one supplier. Throws on timeout / non-2xx so Temporal's retry policy applies. */
async function fetchSupplierHotels(supplier, city) {
  const attempt = Context.current().info.attempt;
  const url = `${config.supplierBaseUrl}${SUPPLIER_PATH[supplier]}?city=${encodeURIComponent(city)}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(config.supplierTimeoutMs) });
    if (!res.ok) throw new Error(`${supplier} responded with HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body)) throw new Error(`${supplier} returned a non-array payload`);

    const offers = body.filter(isValid).map((h) => ({
      name: h.name.trim(),
      price: h.price,
      supplier,
      commissionPct: Number(h.commissionPct) || 0,
    }));
    log.info('supplier fetched', {
      supplier, city, count: offers.length, dropped: body.length - offers.length, attempt, ms: Date.now() - started,
    });
    return offers;
  } catch (err) {
    log.error('supplier fetch failed', { supplier, city, attempt, ms: Date.now() - started, err });
    throw err;
  }
}

/** Persists the de-duplicated list to Redis (ZSET for price range + HASH for payload). */
async function saveHotelsToRedis(city, hotels) {
  try {
    await saveHotels(city, hotels);
    log.info('hotels saved to redis', { city, count: hotels.length });
    return hotels.length;
  } catch (err) {
    log.error('redis save failed', { city, err });
    throw err;
  }
}

module.exports = { fetchSupplierHotels, saveHotelsToRedis };
