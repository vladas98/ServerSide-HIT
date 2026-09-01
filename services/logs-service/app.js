'use strict';

const express = require('express');
const { createLogger } = require('../../lib/logger');
const { createRequestLogger } = require('../../lib/requestLogger');
const { errorHandler } = require('../../lib/errors');
const Log = require('../../models/Log.model');

const PROCESS_NAME = 'logs-service';

// Builds the Express app without connecting to MongoDB or listening on a
// port, so tests can mount it against an isolated in-memory database.
function createApp() {
  const app = express();
  const logger = createLogger(PROCESS_NAME);

  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.get('/api/logs', async (req, res, next) => {
    try {
      await logger.log('GET /api/logs accessed');
      const logs = await Log.find().sort({ created_at: -1 }).lean();
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return { app, logger };
}

module.exports = { createApp, PROCESS_NAME };
