/**
 * Currency Model
 * Stores user experience, level, money, and bank information
 */

const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true
  },
  exp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  money: {
    type: Number,
    default: 0
  },
  bank: {
    type: Number,
    default: 0
  },
  bankCapacity: {
    type: Number,
    default: 5000
  },
  daily: {
    type: Date,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  inventory: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model('Currency', currencySchema);