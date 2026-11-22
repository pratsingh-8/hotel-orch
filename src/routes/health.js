const { Router } = require('express');
const config = require('../config');
const { getRedis } = require('../redis');
const { getTemporalClient } = require('../temporal/client');

async function timed(fn) {
  const start = Date.now();
  try {
    await fn();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

const checkSupplier = (path) =>
  timed(async () => {
    const res = await fetch(`${config.supplierBaseUrl}${path}?city=delhi`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

function createHealthRouter() {
  const r = Router();
  r.get('/health', async (_req, res) => {
    const [supplierA, supplierB, redis, temporal] = await Promise.all([
      checkSupplier('/supplierA/hotels'),
      checkSupplier('/supplierB/hotels'),
      timed(async () => {
        await getRedis().ping();
      }),
      timed(async () => {
        await getTemporalClient().connection.workflowService.getSystemInfo({});
      }),
    ]);

    const suppliersUp = [supplierA, supplierB].filter((c) => c.status === 'up').length;
    // down: can't serve at all; degraded: serving with partial supplier data; ok: all good
    const status =
      redis.status === 'down' || temporal.status === 'down' || suppliersUp === 0
        ? 'down'
        : suppliersUp < 2
          ? 'degraded'
          : 'ok';

    res.status(status === 'down' ? 503 : 200).json({
      status,
      timestamp: new Date().toISOString(),
      checks: { supplierA, supplierB, redis, temporal },
    });
  });
  return r;
}

module.exports = { createHealthRouter };
