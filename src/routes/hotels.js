const { randomUUID } = require('node:crypto');
const { ApplicationFailure, WorkflowFailedError } = require('@temporalio/client');
const { Router } = require('express');
const { ERR_ALL_SUPPLIERS_FAILED, TASK_QUEUE, WORKFLOW_NAME } = require('../constants');
const { filterHotelsByPrice } = require('../hotelStore');
const { createLogger } = require('../logger');
const { getTemporalClient } = require('../temporal/client');

const log = createLogger('api');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parsePrice(raw, name) {
  if (raw === undefined || raw === '') return undefined;
  const n = typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${name} must be a non-negative number`);
  return n;
}

function createHotelsRouter() {
  const r = Router();

  r.get('/hotels', async (req, res, next) => {
    try {
      const city = typeof req.query.city === 'string' ? req.query.city.trim().toLowerCase() : '';
      if (!city) throw new HttpError(400, 'city query parameter is required');

      const minPrice = parsePrice(req.query.minPrice, 'minPrice');
      const maxPrice = parsePrice(req.query.maxPrice, 'maxPrice');
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        throw new HttpError(400, 'minPrice must be <= maxPrice');
      }

      // Orchestrate: suppliers (parallel) -> dedupe -> save to Redis.
      const result = await getTemporalClient().workflow.execute(WORKFLOW_NAME, {
        taskQueue: TASK_QUEUE,
        workflowId: `hotel-offers-${city}-${randomUUID()}`,
        args: [{ city }],
        workflowExecutionTimeout: '30 seconds',
      });

      if (result.failedSuppliers.length) {
        res.setHeader('X-Degraded-Suppliers', result.failedSuppliers.join(','));
      }

      // Price filter is executed inside Redis (ZRANGEBYSCORE) against the list the workflow just saved.
      const hotels =
        minPrice === undefined && maxPrice === undefined
          ? result.hotels
          : await filterHotelsByPrice(city, minPrice, maxPrice);

      log.info('request served', { city, minPrice, maxPrice, count: hotels.length });
      res.json(hotels);
    } catch (err) {
      if (
        err instanceof WorkflowFailedError &&
        err.cause instanceof ApplicationFailure &&
        err.cause.type === ERR_ALL_SUPPLIERS_FAILED
      ) {
        return next(new HttpError(502, 'All suppliers are unavailable'));
      }
      next(err);
    }
  });

  return r;
}

module.exports = { createHotelsRouter };
