'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../services/about-service/app');

let mongoServer;
let app;
let logger;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app, logger } = createApp());
});

afterAll(async () => {
  // log entries are written off the response path; let the in-flight
  // ones land before the connection goes away
  await logger.flush();
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('GET /api/about returns only first_name and last_name per member', async () => {
  const res = await request(app).get('/api/about');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  res.body.forEach((member) => {
    expect(Object.keys(member).sort()).toEqual(['first_name', 'last_name']);
  });
});
