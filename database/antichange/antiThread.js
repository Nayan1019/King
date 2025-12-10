/**
 * AntiThread Model
 * Stores thread anti-change settings and original values
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const antiThreadSchema = new Schema({
  threadID: {
    type: String,
    required: true,
    unique: true
  },
  fullLock: {
    type: Boolean,
    default: false
  },
  groupNameLock: {
    type: Boolean,
    default: false
  },
  groupImageLock: {
    type: Boolean,
    default: false
  },
  nicknameLock: {
    type: Boolean,
    default: false
  },
  originalGroupName: {
    type: String,
    default: null
  },
  originalGroupImage: {
    type: String,
    default: null
  },
  originalNicknames: [
    {
      userID: {
        type: String,
        required: true
      },
      nickname: {
        type: String,
        default: null
      }
    }
  ],
  dateCreated: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AntiThread', antiThreadSchema);