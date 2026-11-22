const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retry an async op with fixed delay — used to wait for Temporal at startup. */
async function retry(fn, { attempts, delayMs, onError }) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (onError) onError(e, i);
      if (i < attempts) await sleep(delayMs);
    }
  }
  throw lastErr;
}

module.exports = { sleep, retry };
