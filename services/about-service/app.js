'use strict';

const express = require('express');
const { createLogger } = require('../../lib/logger');
const { createRequestLogger } = require('../../lib/requestLogger');
const { errorHandler } = require('../../lib/errors');

const PROCESS_NAME = 'about-service';

// Team member names are hardcoded from environment variables rather than
// stored in MongoDB, since the database must be submitted empty except for
// the single seed user.
function getTeamMembers() {
  return [
    {
      first_name: process.env.TEAM_MEMBER_1_FIRST_NAME || 'First1',
      last_name: process.env.TEAM_MEMBER_1_LAST_NAME || 'Last1',
    },
    {
      first_name: process.env.TEAM_MEMBER_2_FIRST_NAME || 'First2',
      last_name: process.env.TEAM_MEMBER_2_LAST_NAME || 'Last2',
    },
  ];
}

function createApp() {
  const app = express();
  const logger = createLogger(PROCESS_NAME);

  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.get('/api/about', async (req, res, next) => {
    try {
      await logger.log('GET /api/about accessed');
      res.json(getTeamMembers());
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return { app, logger };
}

module.exports = { createApp, PROCESS_NAME };
