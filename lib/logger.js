'use strict';

const pino = require('pino');
const Log = require('../models/Log.model');

/* Wraps Pino (console output) with a persistence step that writes the
   same message to the "logs" MongoDB collection, as required by the
   project spec. */
function createLogger(processName) {
  const pinoLogger = pino({ name: processName });
  const pendingWrites = new Set();

  /* Deliberately does not return a promise to await: the round trip to
     MongoDB used to sit on the critical path of every response, roughly
     doubling the latency of an otherwise trivial endpoint. The entry is
     still written, just not before the client gets its answer. */
  function log(message, meta = {}) {
    pinoLogger.info(meta, message);

    const write = Log.create({ process: processName, message, meta })
      .catch((err) => {
        pinoLogger.error(err, 'failed to persist log entry to MongoDB');
      })
      .finally(() => {
        pendingWrites.delete(write);
      });

    pendingWrites.add(write);
  }

  // Waits for the log writes that log() intentionally leaves in flight.
  // Used by the tests, which assert on the logs collection immediately
  // after a request has been answered.
  async function flush() {
    await Promise.all(pendingWrites);
  }

  return { log, flush, pino: pinoLogger };
}

module.exports = { createLogger };
