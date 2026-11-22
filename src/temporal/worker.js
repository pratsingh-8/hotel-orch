const { NativeConnection, Worker } = require('@temporalio/worker');
const config = require('../config');
const { TASK_QUEUE } = require('../constants');
const { closeRedis } = require('../redis');
const { createLogger } = require('../logger');
const { retry } = require('../util');
const activities = require('./activities');

const log = createLogger('worker');

async function run() {
  const connection = await retry(() => NativeConnection.connect({ address: config.temporalAddress }), {
    attempts: 30,
    delayMs: 2000,
    onError: (e, n) => log.warn('waiting for temporal', { attempt: n, err: e }),
  });

  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: TASK_QUEUE,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  log.info('worker started', { taskQueue: TASK_QUEUE, temporal: config.temporalAddress });

  const shutdown = () => {
    log.info('shutting down');
    worker.shutdown();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await worker.run();
  await closeRedis();
  await connection.close();
}

run().catch((err) => {
  log.error('worker crashed', { err });
  process.exit(1);
});
