/**
 * AntiOut Command
 * Controls the anti-out feature for threads
 * When enabled, users who leave the group will be automatically added back
 * Admin removals are not affected
 */

module.exports = {
  config: {
    name: 'antiout',
    aliases: ['ao'],
    version: '1.0.0',
    description: 'Controls anti-out feature for threads',
    usage: '{prefix}antiout [on|off]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'MODERATION'
  },

  /**
   * Command execution
   * @param {Object} options - Command options
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, senderID } = message;
    
    try {
      // Check if user has permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'SUPPORTER');
      if (!hasPermission) {
        return api.sendMessage('⚠️ You do not have permission to use this command. Only bot owner, admin, or supporter can use it.', threadID);
      }

      // If no arguments, show current status
      if (args.length === 0) {
        return showStatus(api, threadID);
      }

      const action = args[0].toLowerCase();

      // Handle different actions
      switch (action) {
        case 'on':
          return enableAntiOut(api, threadID);
        
        case 'off':
          return disableAntiOut(api, threadID);
        
        default:
          return api.sendMessage(
            `⚠️ Invalid action. Available options:\n` +
            `- on: Enable anti-out feature\n` +
            `- off: Disable anti-out feature`,
            threadID
          );
      }
    } catch (error) {
      global.logger.error('Error in antiout command:', error.message);
      return api.sendMessage('❌ An error occurred while processing the command.', threadID);
    }
  }
};

/**
 * Show current anti-out status
 * @param {Object} api - Facebook API instance
 * @param {string} threadID - Thread ID
 */
async function showStatus(api, threadID) {
  try {
    // Get thread settings
    const thread = await global.Thread.findOne({ threadID });
    
    if (!thread) {
      return api.sendMessage('❌ Thread not found in database.', threadID);
    }
    
    const antiOutEnabled = thread.settings?.antiOut || false;
    
    return api.sendMessage(
      `🔒 **Anti-Out Status**\n\n` +
      `- Anti-Out: ${antiOutEnabled ? '✅ ON' : '❌ OFF'}\n` +
      `  • ${antiOutEnabled ? 'Users who leave will be added back automatically' : 'Users can leave the group freely'}`,
      threadID
    );
  } catch (error) {
    global.logger.error('Error showing anti-out status:', error.message);
    return api.sendMessage('❌ An error occurred while checking status.', threadID);
  }
}

/**
 * Enable anti-out feature
 * @param {Object} api - Facebook API instance
 * @param {string} threadID - Thread ID
 */
async function enableAntiOut(api, threadID) {
  try {
    // Get thread from database
    let thread = await global.Thread.findOne({ threadID });
    
    if (!thread) {
      return api.sendMessage('❌ Thread not found in database.', threadID);
    }
    
    // Check if already enabled
    if (thread.settings?.antiOut === true) {
      return api.sendMessage('ℹ️ Anti-out feature is already enabled.', threadID);
    }
    
    // Enable anti-out
    if (!thread.settings) {
      thread.settings = {};
    }
    
    thread.settings.antiOut = true;
    await thread.save();
    
    return api.sendMessage(
      '✅ Anti-out feature has been enabled.\n' +
      'Users who leave the group will be automatically added back.',
      threadID
    );
  } catch (error) {
    global.logger.error('Error enabling anti-out:', error.message);
    return api.sendMessage('❌ An error occurred while enabling anti-out.', threadID);
  }
}

/**
 * Disable anti-out feature
 * @param {Object} api - Facebook API instance
 * @param {string} threadID - Thread ID
 */
async function disableAntiOut(api, threadID) {
  try {
    // Get thread from database
    let thread = await global.Thread.findOne({ threadID });
    
    if (!thread) {
      return api.sendMessage('❌ Thread not found in database.', threadID);
    }
    
    // Check if already disabled
    if (!thread.settings || thread.settings.antiOut !== true) {
      return api.sendMessage('ℹ️ Anti-out feature is already disabled.', threadID);
    }
    
    // Disable anti-out
    if (thread.settings) {
      thread.settings.antiOut = false;
      await thread.save();
    }
    
    return api.sendMessage(
      '✅ Anti-out feature has been disabled.\n' +
      'Users can now leave the group freely.',
      threadID
    );
  } catch (error) {
    global.logger.error('Error disabling anti-out:', error.message);
    return api.sendMessage('❌ An error occurred while disabling anti-out.', threadID);
  }
}