'use strict';

const mongoose = require('mongoose');
const { CATEGORIES } = require('../lib/categories');

const costSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: CATEGORIES,
  },
  userid: {
    type: Number,
    required: true,
  },
  sum: {
    // Mongoose's Number type is stored as a BSON double, matching the
    // "type of sum is Double" requirement.
    type: Number,
    required: true,
    min: 0.01,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

// Serves both of the queries run against this collection: the monthly
// report's userid + created_at range scan, and the per-user total the
// users-service aggregates. Without it either one is a full scan.
costSchema.index({ userid: 1, created_at: 1 });

module.exports = mongoose.model('Cost', costSchema, 'costs');
