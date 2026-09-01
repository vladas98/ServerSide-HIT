'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Cost = require('../models/Cost.model');
const Report = require('../models/Report.model');
const { getMonthlyReport } = require('../services/costs-service/reportService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Cost.deleteMany({});
  await Report.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('computed design pattern for monthly reports', () => {
  test('a past month report is persisted after the first computation', async () => {
    await Cost.create({
      description: 'book', category: 'education', userid: 1, sum: 50, created_at: new Date(2020, 0, 10),
    });

    await getMonthlyReport(1, 2020, 1);

    const cached = await Report.findOne({ userid: 1, year: 2020, month: 1 }).lean();
    expect(cached).not.toBeNull();
  });

  test('a cached past-month report does not change even if the source costs are edited afterwards', async () => {
    await Cost.create({
      description: 'book', category: 'education', userid: 1, sum: 50, created_at: new Date(2020, 0, 10),
    });

    const first = await getMonthlyReport(1, 2020, 1);
    expect(first.costs.find((e) => e.education).education[0].sum).toBe(50);

    await Cost.updateMany({ userid: 1 }, { sum: 999 });

    const second = await getMonthlyReport(1, 2020, 1);
    expect(second.costs.find((e) => e.education).education[0].sum).toBe(50);
  });

  test('the current month is always computed fresh, never cached', async () => {
    const now = new Date();
    await getMonthlyReport(2, now.getFullYear(), now.getMonth() + 1);
    const cached = await Report.findOne({
      userid: 2, year: now.getFullYear(), month: now.getMonth() + 1,
    }).lean();
    expect(cached).toBeNull();
  });
});
