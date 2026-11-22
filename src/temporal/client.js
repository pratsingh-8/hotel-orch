const { Client, Connection } = require('@temporalio/client');
const config = require('../config');
const { createLogger } = require('../logger');
const { retry } = require('../util');

const log = createLogger('temporal-client');
let client;

async function initTemporalClient() {
  const connection = await retry(() => Connection.connect({ address: config.temporalAddress }), {
    attempts: 30,
    delayMs: 2000,
    onError: (e, n) => log.warn('waiting for temporal', { attempt: n, err: e }),
  });
  client = new Client({ connection, namespace: config.temporalNamespace });
  log.info('connected', { address: config.temporalAddress });
  return client;
}

function getTemporalClient() {
  if (!client) throw new Error('Temporal client not initialised');
  return client;
}

module.exports = { initTemporalClient, getTemporalClient };
