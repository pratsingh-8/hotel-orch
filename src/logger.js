function serialize(meta) {
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = v instanceof Error ? { message: v.message, name: v.name } : v;
  }
  return out;
}

function createLogger(scope) {
  const emit = (level, msg, meta = {}) => {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, msg, ...serialize(meta) });
    (level === 'error' ? console.error : console.log)(line);
  };
  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (m, meta) => emit('error', m, meta),
  };
}

module.exports = { createLogger };
