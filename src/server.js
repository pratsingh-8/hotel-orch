const express = require('express');
const config = require('./config');
const { createLogger } = require('./logger');
const { closeRedis } = require('./redis');
const { createHealthRouter } = require('./routes/health');
const { createHotelsRouter } = require('./routes/hotels');
const { createSupplierRouter } = require('./suppliers/router');
const { initTemporalClient } = require('./temporal/client');

const log = createLogger('server');

async function main() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    log.debug('request', { method: req.method, url: req.originalUrl });
    next();
  });

  app.use(createSupplierRouter()); // mock suppliers + admin toggles
  app.use('/api', createHotelsRouter());
  app.use(createHealthRouter());

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = typeof err.status === 'number' ? err.status : 500;
    if (status >= 500) log.error('unhandled error', { err });
    res.status(status).json({ error: status >= 500 && status !== 502 ? 'Internal server error' : err.message });
  });

  await initTemporalClient();
  const server = app.listen(config.port, () => log.info('api listening', { port: config.port }));

  const shutdown = () => {
    log.info('shutting down');
    server.close(async () => {
      await closeRedis();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.error('fatal', { err });
  process.exit(1);
});
