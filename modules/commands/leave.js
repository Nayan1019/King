/**
 * Leave Command
 * Makes the bot leave the current group or a specified group by thread ID
 */

module.exports = {
  config: {
    name: 'leave',
    aliases: ['exit', 'leavegroup'],
    description: 'Makes the bot leave the current group or a specified group by thread ID',
    usage: '{prefix}leave or {prefix}leave [threadID]',
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
    const { threadID, messageID, senderID } = message;
    
    try {
      // Check if user has admin permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
      if (!hasPermission) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      let targetThreadID = threadID;
      let threadInfo;
      
      // If thread ID is provided, use that instead
      if (args.length > 0 && args[0].length > 10) { // Thread IDs are typically long
        targetThreadID = args[0];
        
        // Verify the thread exists
        try {
          threadInfo = await api.getThreadInfo(targetThreadID);
        } catch (error) {
          return api.sendMessage(`❌ Could not find a group with ID: ${targetThreadID}`, threadID, messageID);
        }
      } else {
        // Get current thread info
        threadInfo = await api.getThreadInfo(targetThreadID);
      }
      
      // Check if this is a group chat
      if (!threadInfo.isGroup) {
        return api.sendMessage('❌ This command can only be used for group chats.', threadID, messageID);
      }
      
      // If leaving current thread, send a goodbye message first
      if (targetThreadID === threadID) {
        await api.sendMessage('👋 Goodbye! I am leaving this group as requested by an admin.', threadID);

        // Delete thread from database before leaving
        try {
          await global.controllers.thread.deleteThread(threadID);
          global.logger.database(`Thread ${threadID} deleted from database because bot is leaving voluntarily`);
        } catch (dbError) {
          global.logger.error(`Error deleting thread ${threadID} from database:`, dbError.message);
        }

        // Leave the group after a short delay
        setTimeout(() => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID, (err) => {
            if (err) {
              global.logger.error('Error leaving group:', err);
              api.sendMessage('❌ Failed to leave the group. I might not have permission to leave.', threadID);
            } else {
              global.logger.system(`Bot left thread ${threadID} (${threadInfo.threadName || 'Unknown Group'}) by admin request from ${senderID}`);
            }
          });
        }, 1000);
      } else {
        // Leaving a different thread
        // Send a goodbye message to that thread
        await api.sendMessage('👋 Goodbye! I am leaving this group as requested by an admin.', targetThreadID);

        // Delete thread from database before leaving
        try {
          await global.controllers.thread.deleteThread(targetThreadID);
          global.logger.database(`Thread ${targetThreadID} deleted from database because bot is leaving voluntarily`);
        } catch (dbError) {
          global.logger.error(`Error deleting thread ${targetThreadID} from database:`, dbError.message);
        }

        // Leave the group after a short delay
        setTimeout(() => {
          api.removeUserFromGroup(api.getCurrentUserID(), targetThreadID, (err) => {
            if (err) {
              global.logger.error(`Error leaving group ${targetThreadID}:`, err);
              api.sendMessage(`❌ Failed to leave the group with ID: ${targetThreadID}. I might not have permission to leave.`, threadID, messageID);
            } else {
              api.sendMessage(`✅ Successfully left the group: ${threadInfo.threadName || targetThreadID}`, threadID, messageID);
              global.logger.system(`Bot left thread ${targetThreadID} (${threadInfo.threadName || 'Unknown Group'}) by admin request from ${senderID}`);
            }
          });
        }, 1000);
      }
    } catch (error) {
      global.logger.error('Error in leave command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};