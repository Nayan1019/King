/**
 * NSFW Command
 * Controls the NSFW feature for threads
 * When enabled, NSFW category commands will work in the thread
 * Only admins can enable/disable NSFW setting
 */

module.exports = {
  config: {
    name: 'nsfw',
    aliases: ['adult', 'mature'],
    version: '1.0.0',
    description: 'Controls NSFW content feature for threads',
    usage: '{prefix}nsfw [on|off] or {prefix}nsfw [threadID] [on|off]',
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
    const { threadID, messageID, senderID } = message;
    
    try {
      // Check if user has permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
      if (!hasPermission) {
        return api.sendMessage('⚠️ You do not have permission to use this command. Only bot admins can control NSFW settings.', threadID, messageID);
      }

      // If no arguments, show current status
      if (args.length === 0) {
        return showNSFWStatus(api, threadID, messageID);
      }

      let targetThreadID = threadID;
      let action = args[0]?.toLowerCase();

      // Check if first argument is a thread ID (numeric)
      if (args.length >= 2 && /^\d+$/.test(args[0])) {
        targetThreadID = args[0];
        action = args[1]?.toLowerCase();
      }

      // Validate action
      if (!action || (action !== 'on' && action !== 'off')) {
        return api.sendMessage(
          `⚠️ Invalid action. Available options:\n` +
          `- nsfw on: Enable NSFW content in current thread\n` +
          `- nsfw off: Disable NSFW content in current thread\n` +
          `- nsfw [threadID] on: Enable NSFW content in specific thread\n` +
          `- nsfw [threadID] off: Disable NSFW content in specific thread`,
          threadID,
          messageID
        );
      }

      // Handle different actions
      switch (action) {
        case 'on':
          return enableNSFW(api, targetThreadID, threadID, messageID);
        
        case 'off':
          return disableNSFW(api, targetThreadID, threadID, messageID);
      }
    } catch (error) {
      global.logger.error('Error in nsfw command:', error.message);
      return api.sendMessage('❌ An error occurred while processing the command.', threadID, messageID);
    }
  }
};

/**
 * Show current NSFW status
 * @param {Object} api - Facebook API instance
 * @param {string} threadID - Thread ID
 * @param {string} messageID - Message ID
 */
async function showNSFWStatus(api, threadID, messageID) {
  try {
    // Get thread settings
    const thread = await global.Thread.findOne({ threadID });
    
    if (!thread) {
      return api.sendMessage('❌ Thread not found in database.', threadID, messageID);
    }
    
    const nsfwEnabled = thread.settings?.nsfw || false;
    
    return api.sendMessage(
      `🔞 **NSFW Status**\n\n` +
      `- NSFW Content: ${nsfwEnabled ? '✅ ON' : '❌ OFF'}\n` +
      `  • ${nsfwEnabled ? 'NSFW category commands can be used in this thread' : 'NSFW category commands are blocked in this thread'}\n\n` +
      `Use /nsfw on or /nsfw off to change this setting.`,
      threadID,
      messageID
    );
  } catch (error) {
    global.logger.error('Error showing NSFW status:', error.message);
    return api.sendMessage('❌ An error occurred while checking status.', threadID, messageID);
  }
}

/**
 * Enable NSFW feature
 * @param {Object} api - Facebook API instance
 * @param {string} targetThreadID - Target thread ID
 * @param {string} currentThreadID - Current thread ID
 * @param {string} messageID - Message ID
 */
async function enableNSFW(api, targetThreadID, currentThreadID, messageID) {
  try {
    // Get thread from database
    let thread = await global.Thread.findOne({ threadID: targetThreadID });
    
    if (!thread) {
      // If target thread is different from current, try to get thread info
      if (targetThreadID !== currentThreadID) {
        try {
          const threadInfo = await new Promise((resolve, reject) => {
            api.getThreadInfo(targetThreadID, (err, info) => {
              if (err) return reject(err);
              resolve(info);
            });
          });
          
          // Create thread in database
          thread = await global.Thread.create({
            threadID: targetThreadID,
            threadName: threadInfo.threadName || 'Unknown Group',
            settings: {
              antiJoin: false,
              antiOut: false,
              welcome: true,
              goodbye: true,
              nsfw: true
            }
          });
        } catch (error) {
          return api.sendMessage(`❌ Could not find or create thread with ID ${targetThreadID}.`, currentThreadID, messageID);
        }
      } else {
        return api.sendMessage('❌ Thread not found in database.', currentThreadID, messageID);
      }
    } else {
      // Check if already enabled
      if (thread.settings?.nsfw === true) {
        const threadName = thread.threadName || 'Unknown Group';
        return api.sendMessage(`ℹ️ NSFW feature is already enabled in "${threadName}".`, currentThreadID, messageID);
      }
      
      // Enable NSFW
      if (!thread.settings) {
        thread.settings = {};
      }
      
      thread.settings.nsfw = true;
      await thread.save();
    }
    
    const threadName = thread.threadName || 'Unknown Group';
    const isCurrentThread = targetThreadID === currentThreadID;
    
    // Send confirmation message
    let confirmMessage = `✅ NSFW feature has been enabled in "${threadName}".\n` +
                        `NSFW category commands can now be used in this ${isCurrentThread ? 'thread' : 'group'}.`;
    
    // Send message to current thread
    api.sendMessage(confirmMessage, currentThreadID, messageID);
    
    // If target thread is different from current thread, also notify the target thread
    if (!isCurrentThread) {
      api.sendMessage(
        `🔞 NSFW feature has been enabled in this group by an administrator.\n` +
        `NSFW category commands are now available.`,
        targetThreadID
      );
    }
    
    global.logger.system(`NSFW enabled in thread ${targetThreadID} (${threadName}) by admin`);
    
  } catch (error) {
    global.logger.error('Error enabling NSFW:', error.message);
    return api.sendMessage('❌ An error occurred while enabling NSFW.', currentThreadID, messageID);
  }
}

/**
 * Disable NSFW feature
 * @param {Object} api - Facebook API instance
 * @param {string} targetThreadID - Target thread ID
 * @param {string} currentThreadID - Current thread ID
 * @param {string} messageID - Message ID
 */
async function disableNSFW(api, targetThreadID, currentThreadID, messageID) {
  try {
    // Get thread from database
    let thread = await global.Thread.findOne({ threadID: targetThreadID });
    
    if (!thread) {
      return api.sendMessage(`❌ Thread with ID ${targetThreadID} not found in database.`, currentThreadID, messageID);
    }
    
    // Check if already disabled
    if (!thread.settings || thread.settings.nsfw !== true) {
      const threadName = thread.threadName || 'Unknown Group';
      return api.sendMessage(`ℹ️ NSFW feature is already disabled in "${threadName}".`, currentThreadID, messageID);
    }
    
    // Disable NSFW
    thread.settings.nsfw = false;
    await thread.save();
    
    const threadName = thread.threadName || 'Unknown Group';
    const isCurrentThread = targetThreadID === currentThreadID;
    
    // Send confirmation message
    let confirmMessage = `✅ NSFW feature has been disabled in "${threadName}".\n` +
                        `NSFW category commands are now blocked in this ${isCurrentThread ? 'thread' : 'group'}.`;
    
    // Send message to current thread
    api.sendMessage(confirmMessage, currentThreadID, messageID);
    
    // If target thread is different from current thread, also notify the target thread
    if (!isCurrentThread) {
      api.sendMessage(
        `🔒 NSFW feature has been disabled in this group by an administrator.\n` +
        `NSFW category commands are no longer available.`,
        targetThreadID
      );
    }
    
    global.logger.system(`NSFW disabled in thread ${targetThreadID} (${threadName}) by admin`);
    
  } catch (error) {
    global.logger.error('Error disabling NSFW:', error.message);
    return api.sendMessage('❌ An error occurred while disabling NSFW.', currentThreadID, messageID);
  }
}
