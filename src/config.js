const port = Number(process.env.PORT || 3000);

module.exports = {
  port,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || 'default',
  supplierBaseUrl: process.env.SUPPLIER_BASE_URL || `http://localhost:${port}`,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  supplierTimeoutMs: 3000,
  supplierADown: process.env.SUPPLIER_A_DOWN === 'true',
  supplierBDown: process.env.SUPPLIER_B_DOWN === 'true',
};
