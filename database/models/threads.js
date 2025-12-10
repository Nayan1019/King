/**
 * Thread Model
 * Stores thread (group chat) information and ban status
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const threadSchema = new Schema({
  threadID: {
    type: String,
    required: true,
    unique: true
  },
  threadName: {
    type: String,
    default: 'Unknown Group'
  },
  users: [
    {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      nickname: {
        type: String,
        default: null
      },
      gender: {
        type: String,
        default: null
      },
      vanity: {
        type: String,
        default: null
      }
    }
  ],
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  settings: {
    antiJoin: {
      type: Boolean,
      default: false
    },
    antiOut: {
      type: Boolean,
      default: false
    },
    welcome: {
      type: Schema.Types.Mixed,
      default: true
    },
    goodbye: {
      type: Schema.Types.Mixed,
      default: true
    },
    nsfw: {
      type: Boolean,
      default: false
    },
    autosend: {
      type: Boolean,
      default: null  // null means it follows global setting
    },
    adminOnlyMode: {
      type: String,
      enum: ['owner', 'admin', 'support', null],
      default: null  // null means public (no restriction)
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      default: null
    }
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  imageURL: {
    type: String,
    default: null
  },
  messageCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

module.exports = mongoose.model('Thread', threadSchema);