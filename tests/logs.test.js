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
  // Let the in-flight log writes land before wiping the collection, so a
  // write started by one test cannot reappear in the middle of the next.
  await logger.flush();
  await Log.deleteMany({});
});

afterAll(async () => {
  // log entries are written off the response path; let the in-flight
  // ones land before the connection goes away
  await logger.flush();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('logs-service', () => {
  test('every request and endpoint access is written to the logs collection', async () => {
    await request(app).get('/api/logs');
    // log entries are written off the response path, so wait for them
    await logger.flush();
    const logs = await Log.find().lean();
    // One entry from the request-logger middleware, one from the endpoint
    // handler itself.
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/logs returns the stored log documents', async () => {
    // Seeded directly so the reply is asserted against a known document
    // rather than against whatever the request itself happens to log.
    await Log.create({
      process: 'users-service', message: 'seeded entry', meta: { id: 1 },
    });

    const res = await request(app).get('/api/logs');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const seeded = res.body.find((entry) => entry.message === 'seeded entry');
    expect(seeded).toBeDefined();
    // The reply must use the property names of the logs collection.
    expect(seeded.process).toBe('users-service');
    expect(seeded.meta).toEqual({ id: 1 });
    expect(seeded).toHaveProperty('created_at');
  });

  test('GET /api/logs returns the newest entry first', async () => {
    await Log.create({
      process: 'users-service', message: 'older', created_at: new Date(2020, 0, 1),
    });
    await Log.create({
      process: 'users-service', message: 'newer', created_at: new Date(2021, 0, 1),
    });

    const res = await request(app).get('/api/logs');

    // Only the two seeded entries are compared; the request logger adds
    // its own entries dated now, which would otherwise sort in between.
    const seeded = res.body
      .filter((entry) => entry.message === 'older' || entry.message === 'newer')
      .map((entry) => entry.message);
    expect(seeded).toEqual(['newer', 'older']);
  });

  test('GET /api/logs accepts the trailing-slash form used by the course test script', async () => {
    const res = await request(app).get('/api/logs/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
