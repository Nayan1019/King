/**
 * Unban Command
 * Simplified command to unban users or threads
 */

module.exports = {
  config: {
    name: 'unban',
    aliases: ['ub'],
    description: 'Unban a user or thread from using the bot',
    usage: '{prefix}unban [user/thread] [ID/@mention]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;
    
    // Check if no arguments provided
    if (args.length === 0) {
      return global.api.sendMessage(
        `🔓 Unban Command Usage:\n` +
        `- {prefix}unban user [userID/@mention]: Unban a user\n` +
        `- {prefix}unban thread [threadID]: Unban a thread`,
        threadID,
        messageID
      );
    }
    
    const targetType = args[0].toLowerCase();
    let targetID;
    
    // Check if user is mentioned
    if (targetType === 'user' && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else {
      targetID = args[1];
    }
    
    if (!targetType || !targetID) {
      return global.api.sendMessage(
        '❌ Missing target type (user/thread) or ID/mention',
        threadID,
        messageID
      );
    }
    
    if (targetType === 'user') {
      // Unban user
      try {
        // Check if user exists
        const user = await global.User.findOne({ userID: targetID });
        
        if (!user) {
          return global.api.sendMessage(
            `❌ User with ID ${targetID} not found in database`,
            threadID,
            messageID
          );
        }
        
        // Check if user is not banned
        if (!user.isBanned) {
          return global.api.sendMessage(
            `❌ User ${user.name} is not banned`,
            threadID,
            messageID
          );
        }
        
        // Unban user
        user.isBanned = false;
        user.banReason = '';
        await user.save();
        
        global.logger.system(`User ${targetID} (${user.name}) was unbanned by ${senderID}`);
        
        return global.api.sendMessage(
          `✅ Unbanned user ${user.name} (${targetID})`,
          threadID,
          messageID
        );
        
      } catch (error) {
        global.logger.error('Error in unban user command:', error.message);
        return global.api.sendMessage(
          '❌ An error occurred while unbanning the user',
          threadID,
          messageID
        );
      }
    } else if (targetType === 'thread') {
      // Unban thread
      try {
        // Check if thread exists
        const thread = await global.Thread.findOne({ threadID: targetID });
        
        if (!thread) {
          return global.api.sendMessage(
            `❌ Thread with ID ${targetID} not found in database`,
            threadID,
            messageID
          );
        }
        
        // Check if thread is not banned
        if (!thread.isBanned) {
          return global.api.sendMessage(
            `❌ Thread ${thread.threadName} is not banned`,
            threadID,
            messageID
          );
        }
        
        // Unban thread
        thread.isBanned = false;
        thread.banReason = '';
        await thread.save();
        
        global.logger.system(`Thread ${targetID} (${thread.threadName}) was unbanned by ${senderID}`);
        
        // Notify the unbanned thread
        await global.api.sendMessage(
          `✅ This group has been unbanned and can now use the bot again.`,
          targetID
        );
        
        return global.api.sendMessage(
          `✅ Unbanned thread ${thread.threadName} (${targetID})`,
          threadID,
          messageID
        );
        
      } catch (error) {
        global.logger.error('Error in unban thread command:', error.message);
        return global.api.sendMessage(
          '❌ An error occurred while unbanning the thread',
          threadID,
          messageID
        );
      }
    } else {
      return global.api.sendMessage(
        '❌ Invalid target type. Use "user" or "thread"',
        threadID,
        messageID
      );
    }
  }
};