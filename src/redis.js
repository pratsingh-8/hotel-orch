const Redis = require('ioredis');
const config = require('./config');

let client;

function getRedis() {
  if (!client) client = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
  return client;
}

async function closeRedis() {
  if (client) {
    await client.quit();
    client = undefined;
  }
}

module.exports = { getRedis, closeRedis };
