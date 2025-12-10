/**
 * Spam Ban Command
 * Manages spam detection and automatic banning
 */

// Global spam tracking object
global.spamTracker = global.spamTracker || new Map();

module.exports = {
  config: {
    name: "spamban",
    aliases: ["spam", "antispan"],
    description: "Manage spam detection and auto-banning",
    usages: "{prefix}spamban <on/off/status/reset>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "ADMIN",
    hasPrefix: true,
    permission: "ADMIN",
    cooldowns: 5
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;

    // Initialize global spam settings from config.json
    if (!global.config.spamBanSettings) {
      const spamBanConfig = global.config.spamBan || {
        enabled: true,
        maxCommands: 10,
        timeWindowMinutes: 2,
        banDurationHours: 24
      };
      
      global.config.spamBanSettings = {
        enabled: spamBanConfig.enabled,
        maxCommands: spamBanConfig.maxCommands,
        timeWindow: spamBanConfig.timeWindowMinutes * 60 * 1000, // Convert minutes to milliseconds
        banDuration: spamBanConfig.banDurationHours * 60 * 60 * 1000 // Convert hours to milliseconds
      };
    }

    // Check if arguments are provided
    if (!args || args.length === 0) {
      const statusMsg = await api.sendMessage(`🔄 Checking spam ban status...`, threadID);
      
      const status = global.config.spamBanSettings.enabled ? "✅ ENABLED" : "❌ DISABLED";
      const statsText = `🛡️ **SPAM BAN STATUS: ${status}**\n\n` +
        `⚙️ Settings:\n` +
        `• Max commands: ${global.config.spamBanSettings.maxCommands} in ${global.config.spamBanSettings.timeWindow / 60000} minutes\n` +
        `• Ban duration: ${global.config.spamBanSettings.banDuration / (60 * 60 * 1000)} hours\n` +
        `• Currently tracking: ${global.spamTracker.size} users\n\n` +
        `📝 Usage:\n` +
        `• ${global.config.prefix}spamban on - Enable spam detection\n` +
        `• ${global.config.prefix}spamban off - Disable spam detection\n` +
        `• ${global.config.prefix}spamban status - Show current status\n` +
        `• ${global.config.prefix}spamban reset - Clear tracking data\n\n` +
        `⚠️ Auto-ban: Users who send ${global.config.spamBanSettings.maxCommands}+ commands in ${global.config.spamBanSettings.timeWindow / 60000} minutes get banned automatically.`;
      
      return api.editMessage(statsText, statusMsg.messageID);
    }

    const action = args[0].toLowerCase();
    const statusMsg = await api.sendMessage(`🔄 Processing spam ban ${action}...`, threadID);

    switch (action) {
      case 'on':
        global.config.spamBanSettings.enabled = true;
        return api.editMessage("✅ Spam detection is now **ENABLED**! 🛡️\n\nUsers will be automatically banned for excessive command usage.", statusMsg.messageID);
      
      case 'off':
        global.config.spamBanSettings.enabled = false;
        return api.editMessage("🛑 Spam detection is now **DISABLED**! ⚠️\n\nUsers will NOT be banned for spam.", statusMsg.messageID);
      
      case 'status':
        const currentStatus = global.config.spamBanSettings.enabled ? "✅ ENABLED" : "❌ DISABLED";
        const statusText = `🛡️ **SPAM BAN STATUS: ${currentStatus}**\n\n` +
          `📊 Current Statistics:\n` +
          `• Users being tracked: ${global.spamTracker.size}\n` +
          `• Max commands allowed: ${global.config.spamBanSettings.maxCommands}\n` +
          `• Time window: ${global.config.spamBanSettings.timeWindow / 60000} minutes\n` +
          `• Ban duration: ${global.config.spamBanSettings.banDuration / (60 * 60 * 1000)} hours`;
        
        return api.editMessage(statusText, statusMsg.messageID);
      
      case 'reset':
        const trackedUsers = global.spamTracker.size;
        global.spamTracker.clear();
        return api.editMessage(`🔄 Spam tracking data cleared!\n\n📊 Cleared tracking for ${trackedUsers} users.`, statusMsg.messageID);
      
      default:
        return api.editMessage(
          `❌ Invalid argument: "${action}"\n\nValid options: on, off, status, reset\n\nExample: ${global.config.prefix}spamban on`,
          statusMsg.messageID
        );
    }
  }
};

/**
 * Track user command usage and check for spam
 * @param {string} userID - User ID
 * @param {Object} api - Facebook API instance
 * @param {string} threadID - Thread ID
 * @returns {Promise<boolean>} - Returns true if user should be banned
 */
async function trackSpamUsage(userID, api, threadID) {
  // Skip if spam detection is disabled
  if (!global.config.spamBanSettings || !global.config.spamBanSettings.enabled) {
    return false;
  }

  // Skip for owner and admins
  if (userID === global.config.ownerID || global.config.adminIDs.includes(userID)) {
    return false;
  }

  const now = Date.now();
  const timeWindow = global.config.spamBanSettings.timeWindow;
  const maxCommands = global.config.spamBanSettings.maxCommands;

  // Get or create user tracking data
  if (!global.spamTracker.has(userID)) {
    global.spamTracker.set(userID, []);
  }

  const userCommands = global.spamTracker.get(userID);
  
  // Add current timestamp
  userCommands.push(now);
  
  // Remove old timestamps outside the time window
  const recentCommands = userCommands.filter(timestamp => now - timestamp <= timeWindow);
  global.spamTracker.set(userID, recentCommands);

  // Check if user exceeded the limit
  if (recentCommands.length > maxCommands) {
    try {
      // Ban the user in database
      await global.User.findOneAndUpdate(
        { userID },
        { 
          isBanned: true,
          banReason: `Automatic ban for spam (${recentCommands.length} commands in ${timeWindow / 60000} minutes)`,
          banDate: new Date(),
          banDuration: global.config.spamBanSettings.banDuration
        },
        { upsert: true, new: true }
      );

      // Get user info for notification
      let userName = 'Unknown User';
      try {
        const userInfo = await new Promise((resolve, reject) => {
          api.getUserInfo(userID, (err, info) => {
            if (err) return reject(err);
            resolve(info[userID]);
          });
        });
        userName = userInfo ? userInfo.name : 'Unknown User';
      } catch (err) {
        console.error('Error getting user info for spam ban:', err.message);
      }

      // Send ban notification
      const banMessage = `🚫 **AUTOMATIC SPAM BAN**\n\n` +
        `👤 User: ${userName}\n` +
        `🆔 ID: ${userID}\n` +
        `📊 Commands sent: ${recentCommands.length} in ${timeWindow / 60000} minutes\n` +
        `⏰ Ban duration: ${global.config.spamBanSettings.banDuration / (60 * 60 * 1000)} hours\n` +
        `📝 Reason: Excessive command usage (spam)\n\n` +
        `⚠️ This user has been automatically banned from using bot commands.`;

      api.sendMessage(banMessage, threadID);

      // Remove user from spam tracker
      global.spamTracker.delete(userID);

      // Log the ban
      console.log(`[SPAM BAN] User ${userID} (${userName}) banned for spam: ${recentCommands.length} commands in ${timeWindow / 60000} minutes`);

      return true;
    } catch (error) {
      console.error('Error banning spam user:', error);
      return false;
    }
  }

  return false;
}

// Export the tracking function
module.exports.trackSpamUsage = trackSpamUsage;
