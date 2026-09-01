'use strict';

const mongoose = require('mongoose');

// "id" is a client-facing identifier and is unrelated to Mongo's own
// "_id" — the two are never mixed together.
const userSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  birthday: {
    type: Date,
    required: true,
  },
}, { versionKey: false });

module.exports = mongoose.model('User', userSchema, 'users');
