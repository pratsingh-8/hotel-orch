const { ApplicationFailure, log, proxyActivities } = require('@temporalio/workflow');
const { selectBestOffers } = require('../dedupe');
const { ERR_ALL_SUPPLIERS_FAILED } = require('../constants');

// Only the activity *names/types* are used here; the implementations run in the worker.
const { fetchSupplierHotels, saveHotelsToRedis } = proxyActivities({
  startToCloseTimeout: '10 seconds',
  retry: { initialInterval: '500 milliseconds', backoffCoefficient: 2, maximumAttempts: 3 },
});

const SUPPLIERS = ['Supplier A', 'Supplier B'];

async function hotelOffersWorkflow({ city }) {
  log.info('workflow started', { city });

  // 1. Call both suppliers in parallel; allSettled so one failure doesn't sink the other.
  const settled = await Promise.allSettled(SUPPLIERS.map((s) => fetchSupplierHotels(s, city)));

  const offers = [];
  const failedSuppliers = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') offers.push(...r.value);
    else {
      failedSuppliers.push(SUPPLIERS[i]);
      log.warn('supplier failed after retries', { supplier: SUPPLIERS[i], city });
    }
  });

  if (failedSuppliers.length === SUPPLIERS.length) {
    throw ApplicationFailure.nonRetryable('All suppliers failed', ERR_ALL_SUPPLIERS_FAILED);
  }

  // 2. Dedupe by name, keep cheapest (single-supplier hotels pass through).
  const hotels = selectBestOffers(offers);

  // 3. Save to Redis (also for empty results, so stale data is cleared).
  await saveHotelsToRedis(city, hotels);

  log.info('workflow completed', { city, hotels: hotels.length, failedSuppliers });
  return { hotels, failedSuppliers };
}

module.exports = { hotelOffersWorkflow };
