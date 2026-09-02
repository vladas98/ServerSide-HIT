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

// This collection gains an entry on every request to every service, so
// the newest-first sort in GET /api/logs needs an index to stay cheap as
// it grows.
logSchema.index({ created_at: -1 });

module.exports = mongoose.model('Log', logSchema, 'logs');
