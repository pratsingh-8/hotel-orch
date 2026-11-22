const { Router } = require('express');
const config = require('../config');
const { createLogger } = require('../logger');
const { supplierAData, supplierBData } = require('./mockData');

const log = createLogger('mock-suppliers');

// In-memory toggles so "supplier down" can be simulated at runtime (see /admin routes).
const down = { a: config.supplierADown, b: config.supplierBDown };

function supplierHandler(key, data) {
  return (req, res) => {
    if (down[key]) {
      log.warn('supplier simulated down', { supplier: key.toUpperCase() });
      return res.status(503).json({ error: `Supplier ${key.toUpperCase()} unavailable` });
    }
    const city = typeof req.query.city === 'string' ? req.query.city.trim().toLowerCase() : undefined;
    res.json(city ? data.filter((h) => h.city === city) : data);
  };
}

function createSupplierRouter() {
  const r = Router();
  r.get('/supplierA/hotels', supplierHandler('a', supplierAData));
  r.get('/supplierB/hotels', supplierHandler('b', supplierBData));

  // Failure-simulation controls (demo only).
  r.post('/admin/suppliers/:id/:state', (req, res, next) => {
    const id = req.params.id.toLowerCase();
    const { state } = req.params;
    if ((id !== 'a' && id !== 'b') || (state !== 'down' && state !== 'up')) {
      return next(Object.assign(new Error('Use /admin/suppliers/{a|b}/{down|up}'), { status: 400 }));
    }
    down[id] = state === 'down';
    log.info('supplier state changed', { supplier: id.toUpperCase(), state });
    res.json({ supplierA: down.a ? 'down' : 'up', supplierB: down.b ? 'down' : 'up' });
  });
  return r;
}

module.exports = { createSupplierRouter };
