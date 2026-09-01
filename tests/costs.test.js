'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../services/costs-service/app');
const Cost = require('../models/Cost.model');
const Report = require('../models/Report.model');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = createApp());
});

beforeEach(() => {
  // costs-service calls users-service over HTTP to check a userid exists;
  // stub that network call so these tests don't need a real users-service.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ exists: true }),
  });
});

afterEach(async () => {
  await Cost.deleteMany({});
  await Report.deleteMany({});
  jest.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('costs-service', () => {
  test('POST /api/add creates a cost item', async () => {
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'food', userid: 123123, sum: 8,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      description: 'milk', category: 'food', userid: 123123, sum: 8,
    });
  });

  test('POST /api/add rejects a non-positive sum', async () => {
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'food', userid: 123123, sum: -1,
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/add rejects an unknown category', async () => {
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'nope', userid: 123123, sum: 8,
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/add rejects an unknown user', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ exists: false }) });
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'food', userid: 999, sum: 8,
    });
    expect(res.status).toBe(404);
  });

  test('GET /api/report groups costs by category, including empty ones', async () => {
    const now = new Date();
    await Cost.create({
      description: 'milk', category: 'food', userid: 123123, sum: 8, created_at: now,
    });

    const res = await request(app).get('/api/report').query({
      id: 123123, year: now.getFullYear(), month: now.getMonth() + 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.costs).toHaveLength(5);
    expect(res.body.costs.find((entry) => entry.food).food).toHaveLength(1);
    expect(res.body.costs.find((entry) => entry.sport).sport).toEqual([]);
  });

  test('GET /api/report rejects a missing month', async () => {
    const res = await request(app).get('/api/report').query({ id: 123123, year: 2026 });
    expect(res.status).toBe(400);
  });

  test('POST /api/add rejects a created_at dated in a past month', async () => {
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'food', userid: 123123, sum: 8, created_at: '2020-01-15',
    });
    expect(res.status).toBe(400);
    const stored = await Cost.find({});
    expect(stored).toHaveLength(0);
  });

  test('POST /api/add accepts a created_at within the current month', async () => {
    const now = new Date();
    const res = await request(app).post('/api/add').send({
      description: 'milk', category: 'food', userid: 123123, sum: 8, created_at: now.toISOString(),
    });
    expect(res.status).toBe(201);
  });
});
