'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../services/logs-service/app');
const Log = require('../models/Log.model');

let mongoServer;
let app;
let logger;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app, logger } = createApp());
});

afterEach(async () => {
  await Log.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('every request and endpoint access is written to the logs collection', async () => {
  await request(app).get('/api/logs');
  // log entries are written off the response path, so wait for them
  await logger.flush();
  const logs = await Log.find().lean();
  // One entry from the request-logger middleware, one from the endpoint
  // handler itself.
  expect(logs.length).toBeGreaterThanOrEqual(2);
});
