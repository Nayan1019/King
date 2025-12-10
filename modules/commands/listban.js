/**
 * List Ban Command
 * Lists banned users or threads with indexing and allows unbanning via reply
 */

module.exports = {
  config: {
    name: 'listban',
    aliases: ['lban', 'banlist'],
    description: 'List banned users or threads with ability to unban via reply',
    usage: '{prefix}listban [user/thread]',
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
    const { threadID, messageID, senderID } = message;
    
    // Check if no arguments provided
    if (args.length === 0) {
      return api.sendMessage(
        `🚫 List Ban Commands:\n` +
        `- ${global.config.prefix}listban user: List all banned users\n` +
        `- ${global.config.prefix}listban thread: List all banned threads\n\n` +
        `💡 After viewing the list, reply with numbers (e.g., "1" or "1 2 3") to unban those users/threads.`,
        threadID,
        messageID
      );
    }
    
    const subCommand = args[0].toLowerCase();
    
    if (subCommand === 'user') {
      await this.listBannedUsers({ api, message });
    } else if (subCommand === 'thread') {
      await this.listBannedThreads({ api, message });
    } else {
      return api.sendMessage(
        '❌ Invalid subcommand. Use "user" or "thread".',
        threadID,
        messageID
      );
    }
  },
  
  /**
   * List all banned users
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  listBannedUsers: async function({ api, message }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get all banned users from database
      const bannedUsers = await global.User.find({ isBanned: true }).sort({ name: 1 });
      
      if (bannedUsers.length === 0) {
        return api.sendMessage('✅ No banned users found!', threadID, messageID);
      }
      
      // Format the list with index numbers
      let msg = `🚫 **Total Banned Users: ${bannedUsers.length}**\n\n`;
      
      bannedUsers.forEach((user, index) => {
        const userName = user.name || 'Unknown User';
        const userID = user.userID;
        const reason = user.banReason || 'No reason provided';
        
        msg += `${index + 1}. ${userName} (${userID})\n`;
        msg += `   📝 Reason: ${reason}\n\n`;
      });
      
      msg += `💡 **How to unban:**\n`;
      msg += `Reply to this message with index numbers to unban.\n`;
      msg += `Examples:\n`;
      msg += `• "1" - Unban user #1\n`;
      msg += `• "1 3 5" - Unban users #1, #3, and #5\n`;
      msg += `• "2 4" - Unban users #2 and #4`;
      
      // Send the list and store the reply handler
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);
        
        // Store user list in global client replies for later actions
        if (!global.client.replies) {
          global.client.replies = new Map();
        }
        
        const currentReplies = global.client.replies.get(threadID) || [];
        currentReplies.push({
          messageID: info.messageID,
          command: this.config.name,
          expectedSender: senderID,
          data: {
            users: bannedUsers,
            type: 'user'
          },
          createdAt: Date.now()
        });
        
        global.client.replies.set(threadID, currentReplies);
        
        // Auto cleanup after 10 minutes
        setTimeout(() => {
          const replies = global.client.replies.get(threadID) || [];
          const updatedReplies = replies.filter(reply => 
            reply.messageID !== info.messageID
          );
          
          if (updatedReplies.length > 0) {
            global.client.replies.set(threadID, updatedReplies);
          } else {
            global.client.replies.delete(threadID);
          }
        }, 10 * 60 * 1000);
      });
      
    } catch (error) {
      global.logger.error('Error in listban users command:', error);
      return api.sendMessage('❌ An error occurred while fetching banned users.', threadID, messageID);
    }
  },
  
  /**
   * List all banned threads
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  listBannedThreads: async function({ api, message }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get all banned threads from database
      const bannedThreads = await global.Thread.find({ isBanned: true }).sort({ threadName: 1 });
      
      if (bannedThreads.length === 0) {
        return api.sendMessage('✅ No banned threads found!', threadID, messageID);
      }
      
      // Format the list with index numbers
      let msg = `🚫 **Total Banned Threads: ${bannedThreads.length}**\n\n`;
      
      bannedThreads.forEach((thread, index) => {
        const threadName = thread.threadName || 'Unknown Thread';
        const threadId = thread.threadID;
        const reason = thread.banReason || 'No reason provided';
        
        msg += `${index + 1}. ${threadName} (${threadId})\n`;
        msg += `   📝 Reason: ${reason}\n\n`;
      });
      
      msg += `💡 **How to unban:**\n`;
      msg += `Reply to this message with index numbers to unban.\n`;
      msg += `Examples:\n`;
      msg += `• "1" - Unban thread #1\n`;
      msg += `• "1 3 5" - Unban threads #1, #3, and #5\n`;
      msg += `• "2 4" - Unban threads #2 and #4`;
      
      // Send the list and store the reply handler
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);
        
        // Store thread list in global client replies for later actions
        if (!global.client.replies) {
          global.client.replies = new Map();
        }
        
        const currentReplies = global.client.replies.get(threadID) || [];
        currentReplies.push({
          messageID: info.messageID,
          command: this.config.name,
          expectedSender: senderID,
          data: {
            threads: bannedThreads,
            type: 'thread'
          },
          createdAt: Date.now()
        });
        
        global.client.replies.set(threadID, currentReplies);
        
        // Auto cleanup after 10 minutes
        setTimeout(() => {
          const replies = global.client.replies.get(threadID) || [];
          const updatedReplies = replies.filter(reply => 
            reply.messageID !== info.messageID
          );
          
          if (updatedReplies.length > 0) {
            global.client.replies.set(threadID, updatedReplies);
          } else {
            global.client.replies.delete(threadID);
          }
        }, 10 * 60 * 1000);
      });
      
    } catch (error) {
      global.logger.error('Error in listban threads command:', error);
      return api.sendMessage('❌ An error occurred while fetching banned threads.', threadID, messageID);
    }
  },
  
  /**
   * Handle replies to the ban list
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.replyData - Data from the original message
   */
  handleReply: async function({ api, message, replyData }) {
    const { threadID, messageID, body, senderID } = message;
    
    // Debug logging
    console.log('[LISTBAN DEBUG] HandleReply called with:');
    console.log('[LISTBAN DEBUG] replyData:', JSON.stringify(replyData, null, 2));
    console.log('[LISTBAN DEBUG] body:', body);
    
    // Check if replyData exists - replyData is already the data object
    if (!replyData) {
      console.log('[LISTBAN DEBUG] No replyData found!');
      return api.sendMessage('❌ Error: Reply data is missing.', threadID, messageID);
    }
    
    const { type } = replyData;
    const items = replyData.users || replyData.threads;
    
    console.log('[LISTBAN DEBUG] type:', type);
    console.log('[LISTBAN DEBUG] items count:', items ? items.length : 0);
    
    if (!items || !Array.isArray(items)) {
      return api.sendMessage('❌ Error: Invalid data format.', threadID, messageID);
    }
    
    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to perform this action.', threadID, messageID);
    }
    
    // Parse index numbers from reply
    const indexNumbers = body.trim().split(/\s+/)
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num) && num > 0 && num <= items.length);
    
    if (indexNumbers.length === 0) {
      return api.sendMessage(
        `❌ Invalid input. Please provide valid index numbers (1-${items.length}).\n` +
        `Example: "1" or "1 2 3"`,
        threadID,
        messageID
      );
    }
    
    // Remove duplicates and sort
    const uniqueIndexes = [...new Set(indexNumbers)].sort((a, b) => a - b);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const results = [];
      
      for (const index of uniqueIndexes) {
        const item = items[index - 1];
        
        try {
          if (type === 'user') {
            // Unban user
            await global.User.updateOne(
              { userID: item.userID },
              { 
                $set: { 
                  isBanned: false, 
                  banReason: null 
                }
              }
            );
            
            successCount++;
            results.push(`✅ #${index}: ${item.name || 'Unknown User'} (${item.userID})`);
            
            // Log the unban
            global.logger.system(`User ${item.userID} (${item.name}) was unbanned by ${senderID} via listban command`);
            
          } else if (type === 'thread') {
            // Unban thread
            await global.Thread.updateOne(
              { threadID: item.threadID },
              { 
                $set: { 
                  isBanned: false, 
                  banReason: null 
                }
              }
            );
            
            successCount++;
            results.push(`✅ #${index}: ${item.threadName || 'Unknown Thread'} (${item.threadID})`);
            
            // Notify the unbanned thread
            try {
              await api.sendMessage(
                '✅ This thread has been unbanned and can now use the bot again.',
                item.threadID
              );
            } catch (notifyError) {
              // Ignore notification errors
            }
            
            // Log the unban
            global.logger.system(`Thread ${item.threadID} (${item.threadName}) was unbanned by ${senderID} via listban command`);
          }
        } catch (itemError) {
          errorCount++;
          results.push(`❌ #${index}: Failed to unban ${item.name || item.threadName || 'Unknown'}`);
          global.logger.error(`Error unbanning ${type} ${item.userID || item.threadID}:`, itemError);
        }
      }
      
      // Send results
      let resultMsg = `🔓 **Unban Results:**\n\n`;
      resultMsg += `📊 **Summary:** ${successCount} successful, ${errorCount} failed\n\n`;
      resultMsg += `📋 **Details:**\n`;
      resultMsg += results.join('\n');
      
      if (successCount > 0) {
        resultMsg += `\n\n✅ Successfully unbanned ${successCount} ${type}(s)!`;
      }
      
      if (errorCount > 0) {
        resultMsg += `\n\n⚠️ ${errorCount} ${type}(s) could not be unbanned. Check logs for details.`;
      }
      
      api.sendMessage(resultMsg, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in listban handleReply:', error);
      return api.sendMessage(
        '❌ An error occurred while processing the unban requests.',
        threadID,
        messageID
      );
    }
  }
};
