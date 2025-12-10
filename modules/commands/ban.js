/**
 * Ban Command
 * Simplified command to ban users or threads
 */

module.exports = {
  config: {
    name: 'ban',
    aliases: ['b'],
    description: 'Ban a user or thread from using the bot',
    usage: '{prefix}ban [user/thread] [ID/@mention] [reason]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'ADMIN'
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
        `🚫 Ban Command Usage:\n` +
        `- {prefix}ban user [userID/@mention] [reason]: Ban a user\n` +
        `- {prefix}ban thread [threadID] [reason]: Ban a thread`,
        threadID,
        messageID
      );
    }
    
    const targetType = args[0].toLowerCase();
    let targetID;
    let reason;
    
    // Check if user is mentioned
    if (targetType === 'user' && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      // Remove the mention from args to get the reason
      const mentionStr = mentions[targetID].replace('@', '');
      const mentionIndex = args.findIndex(arg => arg.includes(mentionStr));
      
      if (mentionIndex !== -1) {
        // Remove the mention argument
        const newArgs = [...args];
        newArgs.splice(mentionIndex, 1);
        // Remove the 'user' argument
        newArgs.shift();
        reason = newArgs.join(' ') || 'No reason provided';
      } else {
        reason = args.slice(2).join(' ') || 'No reason provided';
      }
    } else {
      targetID = args[1];
      reason = args.slice(2).join(' ') || 'No reason provided';
    }
    
    if (!targetType || !targetID) {
      return global.api.sendMessage(
        '❌ Missing target type (user/thread) or ID/mention',
        threadID,
        messageID
      );
    }
    
    if (targetType === 'user') {
      // Ban user
      try {
        // Check if user exists
        let user = await global.User.findOne({ userID: targetID });
        
        if (!user) {
          // Get user info from Facebook
          try {
            const userInfo = await new Promise((resolve, reject) => {
              api.getUserInfo(targetID, (err, info) => {
                if (err) return reject(err);
                resolve(info[targetID]);
              });
            });
            
            // Create user in database
            user = await global.User.create({
              userID: targetID,
              name: userInfo.name || 'Facebook User'
            });
          } catch (error) {
            return global.api.sendMessage(
              `❌ User with ID ${targetID} not found`,
              threadID,
              messageID
            );
          }
        }
        
        // Check if user is already banned
        if (user.isBanned) {
          return global.api.sendMessage(
            `❌ User ${user.name} is already banned. Reason: ${user.banReason}`,
            threadID,
            messageID
          );
        }
        
        // Check if trying to ban owner or admin
        if (targetID === global.config.ownerID) {
          return global.api.sendMessage(
            '❌ Cannot ban the bot owner',
            threadID,
            messageID
          );
        }
        
        if (global.config.adminIDs.includes(targetID) && senderID !== global.config.ownerID) {
          return global.api.sendMessage(
            '❌ Only the owner can ban an admin',
            threadID,
            messageID
          );
        }
        
        // Ban user
        user.isBanned = true;
        user.banReason = reason;
        await user.save();
        
        global.logger.system(`User ${targetID} (${user.name}) was banned by ${senderID}. Reason: ${reason}`);
        
        return global.api.sendMessage(
          `✅ Banned user ${user.name} (${targetID})\nReason: ${reason}`,
          threadID,
          messageID
        );
        
      } catch (error) {
        global.logger.error('Error in ban user command:', error.message);
        return global.api.sendMessage(
          '❌ An error occurred while banning the user',
          threadID,
          messageID
        );
      }
    } else if (targetType === 'thread') {
      // Ban thread
      try {
        // Check if thread exists
        let thread = await global.Thread.findOne({ threadID: targetID });
        
        if (!thread) {
          // Get thread info from Facebook
          try {
            const threadInfo = await new Promise((resolve, reject) => {
              api.getThreadInfo(targetID, (err, info) => {
                if (err) return reject(err);
                resolve(info);
              });
            });
            
            // Create thread in database
            thread = await global.Thread.create({
              threadID: targetID,
              threadName: threadInfo.threadName || 'Unknown Group'
            });
          } catch (error) {
            return global.api.sendMessage(
              `❌ Thread with ID ${targetID} not found`,
              threadID,
              messageID
            );
          }
        }
        
        // Check if thread is already banned
        if (thread.isBanned) {
          return global.api.sendMessage(
            `❌ Thread ${thread.threadName} is already banned. Reason: ${thread.banReason}`,
            threadID,
            messageID
          );
        }
        
        // Ban thread
        thread.isBanned = true;
        thread.banReason = reason;
        await thread.save();
        
        global.logger.system(`Thread ${targetID} (${thread.threadName}) was banned by ${senderID}. Reason: ${reason}`);
        
        // Notify the banned thread
        await global.api.sendMessage(
          `⚠️ This group has been banned from using the bot\nReason: ${reason}\n\nContact the bot owner for more information.`,
          targetID
        );
        
        return global.api.sendMessage(
          `✅ Banned thread ${thread.threadName} (${targetID})\nReason: ${reason}`,
          threadID,
          messageID
        );
        
      } catch (error) {
        global.logger.error('Error in ban thread command:', error.message);
        return global.api.sendMessage(
          '❌ An error occurred while banning the thread',
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