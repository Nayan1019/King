/**
 * Global Module Loader
 * Centralizes all important modules to eliminate require() calls in other files
 */

const fs = require('fs-extra');
const path = require('path');

// Load models
global.User = require('../database/models/users');
global.Thread = require('../database/models/threads');
global.Currency = require('../database/models/currencies');
global.AntiThread = require('../database/antichange/antiThread');

// Load controllers
global.controllers = {
  thread: require('../database/controller/thread')
};

// Load config
global.config = require('../config.json');

// Load utils
global.logger = require('./logger');
global.loader = require('./loader');
global.api = require('./api');
global.permissions = require('./permissions');
global.server = require('./server');
global.utils = global.api; // Assign global.api to global.utils
global.gender = require('./gender');

// Load handlers
global.handleCommand = require('../handles/handleCommand');
global.handleEvent = require('../handles/handleEvent');
global.handleReply = require('../handles/handleReply');
global.handleReaction = require('../handles/handleReaction');
global.handleCreateDatabase = require('../handles/handleCreateDatabase');
global.handleDatabase = require('../handles/handleDatabase');

// Initialize global maps
global.client = global.client || {};
global.client.commands = global.client.commands || new Map();
global.client.events = global.client.events || new Map();
global.client.cooldowns = global.client.cooldowns || new Map();
global.client.replies = global.client.replies || new Map();
global.client.reactions = global.client.reactions || new Map();

// Export for compatibility
module.exports = {
  User: global.User,
  Thread: global.Thread,
  Currency: global.Currency,
  AntiThread: global.AntiThread,
  controllers: global.controllers,
  config: global.config,
  logger: global.logger,
  loader: global.loader,
  api: global.api,
  handleCommand: global.handleCommand,
  handleEvent: global.handleEvent,
  handleReply: global.handleReply,
  handleReaction: global.handleReaction,
  handleCreateDatabase: global.handleCreateDatabase,
  handleDatabase: global.handleDatabase,
  gender: global.gender
};