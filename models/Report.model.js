'use strict';

const mongoose = require('mongoose');

// Holds a fully pre-computed monthly report. Only reports for months that
// have already ended are stored here (see costs-service/reportService.js),
// since the server never allows backdating a cost into a past month, which
// makes a past month's report permanently stable once computed.
const reportSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  costs: { type: Array, required: true },
}, { versionKey: false });

reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema, 'reports');
