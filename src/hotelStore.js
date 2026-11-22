const config = require('./config');
const { normalizeName } = require('./dedupe');
const { getRedis } = require('./redis');

/**
 * Redis layout per city:
 *   hotels:<city>:prices  (ZSET)  member = normalized hotel name, score = price
 *   hotels:<city>:data    (HASH)  field  = normalized hotel name, value = JSON offer
 *
 * Price-range filtering is done by Redis itself via ZRANGEBYSCORE.
 */
const keys = (city) => {
  const c = city.trim().toLowerCase();
  return { zset: `hotels:${c}:prices`, hash: `hotels:${c}:data` };
};

async function saveHotels(city, hotels) {
  const { zset, hash } = keys(city);
  const tx = getRedis().multi().del(zset, hash);
  if (hotels.length > 0) {
    const zargs = [];
    const hobj = {};
    for (const h of hotels) {
      const k = normalizeName(h.name);
      zargs.push(h.price, k);
      hobj[k] = JSON.stringify(h);
    }
    tx.zadd(zset, ...zargs).hset(hash, hobj);
    tx.expire(zset, config.cacheTtlSeconds).expire(hash, config.cacheTtlSeconds);
  }
  await tx.exec(); // atomic swap: readers never see a half-written list
}

async function filterHotelsByPrice(city, minPrice, maxPrice) {
  const { zset, hash } = keys(city);
  const redis = getRedis();
  const members = await redis.zrangebyscore(
    zset,
    minPrice === undefined ? '-inf' : minPrice,
    maxPrice === undefined ? '+inf' : maxPrice,
  );
  if (members.length === 0) return [];
  const values = await redis.hmget(hash, ...members);
  return values.filter((v) => v !== null).map((v) => JSON.parse(v));
}

module.exports = { saveHotels, filterHotelsByPrice };
