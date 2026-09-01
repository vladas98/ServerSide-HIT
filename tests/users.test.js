'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../services/users-service/app');
const User = require('../models/User.model');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = createApp());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('users-service', () => {
  test('POST /api/add creates a user', async () => {
    const res = await request(app).post('/api/add').send({
      id: 1, first_name: 'John', last_name: 'Doe', birthday: '1990-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, first_name: 'John', last_name: 'Doe' });
  });

  test('POST /api/add rejects missing fields', async () => {
    const res = await request(app).post('/api/add').send({ id: 2 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/add rejects a duplicate id', async () => {
    await User.create({
      id: 3, first_name: 'John', last_name: 'Doe', birthday: new Date(),
    });
    const res = await request(app).post('/api/add').send({
      id: 3, first_name: 'John', last_name: 'Doe', birthday: '1990-01-01',
    });
    expect(res.status).toBe(409);
  });

  test('GET /api/users/:id returns 404 for an unknown user', async () => {
    const res = await request(app).get('/api/users/999');
    expect(res.status).toBe(404);
  });

  test('GET /api/users/:id returns first_name, last_name, id and total', async () => {
    await User.create({
      id: 4, first_name: 'Jane', last_name: 'Doe', birthday: new Date(),
    });
    const res = await request(app).get('/api/users/4');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      first_name: 'Jane', last_name: 'Doe', id: 4, total: 0,
    });
  });

  test('GET /api/users/:id/exists reports existence for the cost service', async () => {
    await User.create({
      id: 5, first_name: 'A', last_name: 'B', birthday: new Date(),
    });
    const found = await request(app).get('/api/users/5/exists');
    const missing = await request(app).get('/api/users/6/exists');
    expect(found.body).toEqual({ exists: true });
    expect(missing.body).toEqual({ exists: false });
  });

  test('GET /api/users lists all users', async () => {
    await User.create({
      id: 7, first_name: 'A', last_name: 'B', birthday: new Date(),
    });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
