'use strict';

const express = require('express');
const { createLogger } = require('../../lib/logger');
const { createRequestLogger } = require('../../lib/requestLogger');
const { AppError, errorHandler } = require('../../lib/errors');
const { CATEGORIES } = require('../../lib/categories');
const Cost = require('../../models/Cost.model');
const { getMonthlyReport, isPastMonth } = require('./reportService');

const PROCESS_NAME = 'costs-service';

// A free-tier host spins an idle service down, so the first call to the
// users-service after a quiet spell can hit an instance that is still
// booting and answer with a gateway error. One retry covers that without
// turning a cold dependency into a failed request; the timeout keeps a
// users-service that never answers from hanging this one indefinitely.
const USERS_SERVICE_TIMEOUT_MS = 8000;
const USERS_SERVICE_ATTEMPTS = 2;

async function userExists(userid, logger) {
  // A trailing slash on the configured URL would produce a double slash,
  // which the users-service does not match against any route.
  const usersServiceUrl = (process.env.USERS_SERVICE_URL || '').replace(/\/+$/, '');
  if (!usersServiceUrl) {
    logger.pino.error('USERS_SERVICE_URL is not set');
    throw new AppError(502, 'could not reach the users service');
  }

  const url = `${usersServiceUrl}/api/users/${userid}/exists`;

  for (let attempt = 1; attempt <= USERS_SERVICE_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(USERS_SERVICE_TIMEOUT_MS),
      });
      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      /* Worth recording the status and the URL that produced it: a wrong
         host in USERS_SERVICE_URL still resolves (onrender.com answers any
         subdomain) and comes back as a plain 404, which is otherwise
         indistinguishable from the users-service itself being down. */
      logger.pino.error({ url, status: response.status }, 'users-service lookup failed');
    } catch (err) {
      logger.pino.error({ url, err }, 'users-service lookup could not complete');
    }
  }

  throw new AppError(502, 'could not reach the users service');
}

function createApp() {
  const app = express();
  const logger = createLogger(PROCESS_NAME);

  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.post('/api/add', async (req, res, next) => {
    try {
      logger.log('POST /api/add (cost) accessed', { body: req.body });

      const { description, category, userid, sum } = req.body;

      if (!description || !category || userid === undefined || sum === undefined) {
        throw new AppError(400, 'description, category, userid and sum are required');
      }
      if (!CATEGORIES.includes(category)) {
        throw new AppError(400, `category must be one of: ${CATEGORIES.join(', ')}`);
      }
      if (typeof sum !== 'number' || sum <= 0) {
        throw new AppError(400, 'sum must be a positive number');
      }
      if (!(await userExists(userid, logger))) {
        throw new AppError(404, `user ${userid} was not found`);
      }

      const created_at = req.body.created_at ? new Date(req.body.created_at) : new Date();
      if (Number.isNaN(created_at.getTime())) {
        throw new AppError(400, 'created_at must be a valid date');
      }
      // Costs can never be backdated into a month that has already ended,
      // since getMonthlyReport() permanently caches past-month reports.
      if (isPastMonth(created_at.getFullYear(), created_at.getMonth() + 1)) {
        throw new AppError(400, 'cannot add a cost item dated in a past month');
      }

      const cost = await Cost.create({ description, category, userid, sum, created_at });

      res.status(201).json({
        description: cost.description,
        category: cost.category,
        userid: cost.userid,
        sum: cost.sum,
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/report', async (req, res, next) => {
    try {
      logger.log('GET /api/report accessed', { query: req.query });

      const userid = Number(req.query.id);
      const year = Number(req.query.year);
      const month = Number(req.query.month);

      if (
        !Number.isInteger(userid) || !Number.isInteger(year) || !Number.isInteger(month)
        || month < 1 || month > 12
      ) {
        throw new AppError(400, 'id, year and month query parameters are required');
      }

      const report = await getMonthlyReport(userid, year, month);
      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return { app, logger };
}

module.exports = { createApp, PROCESS_NAME };
