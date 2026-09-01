'use strict';

const mongoose = require('mongoose');

async function connectToDatabase(processName) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in the environment');
  }

  await mongoose.connect(uri);
  console.log(`[${processName}] connected to MongoDB`);
}

module.exports = { connectToDatabase };
