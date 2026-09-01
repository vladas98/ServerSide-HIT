'use strict';

// Resets the database to the exact state required at submission time: every
// collection empty except for a single seed user (see project Q&A: id
// 123123, mosh israeli). Run with `npm run seed`.

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../lib/db');
const User = require('../models/User.model');
const Cost = require('../models/Cost.model');
const Log = require('../models/Log.model');
const Report = require('../models/Report.model');

async function seed() {
  await connectToDatabase('seed');

  await Promise.all([
    User.deleteMany({}),
    Cost.deleteMany({}),
    Log.deleteMany({}),
    Report.deleteMany({}),
  ]);

  await User.create({
    id: 123123,
    first_name: 'mosh',
    last_name: 'israeli',
    birthday: new Date('1990-01-01'),
  });

  console.log('database reset: only the seed user (123123) remains');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
