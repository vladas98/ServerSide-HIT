'use strict';

const express = require('express');
const { createLogger } = require('../../lib/logger');
const { createRequestLogger } = require('../../lib/requestLogger');
const { AppError, errorHandler } = require('../../lib/errors');
const User = require('../../models/User.model');
const Cost = require('../../models/Cost.model');

const PROCESS_NAME = 'users-service';

function createApp() {
  const app = express();
  const logger = createLogger(PROCESS_NAME);

  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.get('/api/users', async (req, res, next) => {
    try {
      logger.log('GET /api/users accessed');
      const users = await User.find().select('-_id id first_name last_name birthday').lean();
      res.json(users);
    } catch (err) {
      next(err);
    }
  });

  // Internal helper endpoint (see project Q&A #12) used by costs-service to
  // verify a userid exists before it accepts a new cost item, without
  // pulling back the full user document and its aggregated total.
  app.get('/api/users/:id/exists', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const found = await User.exists({ id });
      res.json({ exists: Boolean(found) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/users/:id', async (req, res, next) => {
    try {
      logger.log('GET /api/users/:id accessed', { id: req.params.id });

      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw new AppError(400, 'user id must be an integer');
      }

      const user = await User.findOne({ id }).lean();
      if (!user) {
        throw new AppError(404, `user ${id} was not found`);
      }

      const totals = await Cost.aggregate([
        { $match: { userid: id } },
        { $group: { _id: null, total: { $sum: '$sum' } } },
      ]);

      res.json({
        first_name: user.first_name,
        last_name: user.last_name,
        id: user.id,
        total: totals.length ? totals[0].total : 0,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/add', async (req, res, next) => {
    try {
      logger.log('POST /api/add (user) accessed', { body: req.body });

      const { id, first_name, last_name, birthday } = req.body;
      if (id === undefined || !first_name || !last_name || !birthday) {
        throw new AppError(400, 'id, first_name, last_name and birthday are required');
      }

      const existing = await User.findOne({ id }).lean();
      if (existing) {
        throw new AppError(409, `a user with id ${id} already exists`);
      }

      const user = await User.create({ id, first_name, last_name, birthday });

      res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        birthday: user.birthday,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return { app, logger };
}

module.exports = { createApp, PROCESS_NAME };
