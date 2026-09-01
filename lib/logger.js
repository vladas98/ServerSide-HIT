'use strict';

const pino = require('pino');
const Log = require('../models/Log.model');

/* Wraps Pino (console output) with a persistence step that writes the
   same message to the "logs" MongoDB collection, as required by the
   project spec. */
function createLogger(processName) {
  const pinoLogger = pino({ name: processName });

  async function log(message, meta = {}) {
    pinoLogger.info(meta, message);
    try {
      await Log.create({ process: processName, message, meta });
    } catch (err) {
      pinoLogger.error(err, 'failed to persist log entry to MongoDB');
    }
  }

  return { log, pino: pinoLogger };
}

module.exports = { createLogger };
