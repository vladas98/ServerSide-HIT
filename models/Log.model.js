'use strict';

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  process: String,
  message: String,
  meta: mongoose.Schema.Types.Mixed,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

module.exports = mongoose.model('Log', logSchema, 'logs');
