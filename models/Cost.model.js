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

module.exports = mongoose.model('Cost', costSchema, 'costs');
