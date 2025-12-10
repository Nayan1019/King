/**
 * Thread Command
 * Provides functionality to list and manage threads (group chats)
 */

module.exports = {
  config: {
    name: 'thread',
    aliases: ['threads', 'groups'],
    description: 'List and manage threads (group chats)',
    usage: '{prefix}thread [all/search] [search term]',
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
    
    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to use this command.', threadID, messageID);
    }
    
    // Default to 'all' if no argument provided
    const subCommand = args[0]?.toLowerCase() || 'all';
    
    if (subCommand === 'all') {
      // List all threads
      await this.listAllThreads({ api, message });
    } else if (subCommand === 'search') {
      // Search for threads by name
      const searchTerm = args.slice(1).join(' ');
      if (!searchTerm) {
        return api.sendMessage('❌ Please provide a search term.', threadID, messageID);
      }
      await this.searchThreads({ api, message, searchTerm });
    } else {
      // Invalid subcommand
      return api.sendMessage(
        '❌ Invalid subcommand. Use:\n' +
        '- thread all: List all threads\n' +
        '- thread search [term]: Search for threads by name',
        threadID, messageID
      );
    }
  },
  
  /**
   * List all threads in the database
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  listAllThreads: async function({ api, message }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get all threads from database
      const threads = await global.Thread.find({}).sort({ threadName: 1 });
      
      if (threads.length === 0) {
        return api.sendMessage('❌ No threads found in the database.', threadID, messageID);
      }
      
      // Format the list with index numbers
      let msg = `📋 All Threads (${threads.length}):\n\n`;
      
      threads.forEach((thread, index) => {
        const status = thread.isBanned ? '🚫 Banned' : '✅ Active';
        msg += `${index + 1}. ${thread.threadName} (${thread.threadID})\n   Status: ${status}\n`;
      });
      
      msg += '\n👉 Reply with "[index] [action]" to perform actions:\n';
      msg += '- Actions: ban, unban, out\n';
      msg += '- Example: "1 ban" to ban the first thread\n';
      msg += '- Example: "3 out" to leave the third thread';
      
      // Send the list and store the reply handler
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);
        
        // Store thread list in global client replies for later actions
        global.client.replies.set(threadID, [
          ...(global.client.replies.get(threadID) || []),
          {
            messageID: info.messageID,
            command: this.config.name,
            expectedSender: senderID,
            data: {
              threads,
              type: 'all'
            }
          }
        ]);
      });
    } catch (error) {
      global.logger.error('Error in thread list command:', error);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Search for threads by name
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {string} options.searchTerm - Term to search for
   */
  searchThreads: async function({ api, message, searchTerm }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Search for threads with names containing the search term (case insensitive)
      const threads = await global.Thread.find({
        threadName: { $regex: searchTerm, $options: 'i' }
      }).sort({ threadName: 1 });
      
      if (threads.length === 0) {
        return api.sendMessage(`❌ No threads found matching "${searchTerm}".`, threadID, messageID);
      }
      
      // Format the list with index numbers
      let msg = `🔍 Search Results for "${searchTerm}" (${threads.length}):\n\n`;
      
      threads.forEach((thread, index) => {
        const status = thread.isBanned ? '🚫 Banned' : '✅ Active';
        msg += `${index + 1}. ${thread.threadName} (${thread.threadID})\n   Status: ${status}\n`;
      });
      
      msg += '\n👉 Reply with "[index] [action]" to perform actions:\n';
      msg += '- Actions: ban, unban, out\n';
      msg += '- Example: "1 ban" to ban the first thread\n';
      msg += '- Example: "3 out" to leave the third thread';
      
      // Send the list and store the reply handler
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);
        
        // Store thread list in global client replies for later actions
        global.client.replies.set(threadID, [
          ...(global.client.replies.get(threadID) || []),
          {
            messageID: info.messageID,
            command: this.config.name,
            expectedSender: senderID,
            data: {
              threads,
              type: 'search'
            }
          }
        ]);
      });
    } catch (error) {
      global.logger.error('Error in thread search command:', error);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Handle replies to the thread list
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.replyData - Data from the original message
   */
  handleReply: async function({ api, message, replyData }) {
    const { threadID, messageID, body, senderID } = message;
    
    // Check if replyData exists and has the required properties
    if (!replyData) {
      global.logger.debug('Reply data is missing or invalid');
      return api.sendMessage('❌ Error: Reply data is missing.', threadID, messageID);
    }
    
    // Extract data from replyData (which comes from the data field)
    const { threads, type } = replyData.data || replyData;
    
    if (!threads) {
      global.logger.debug('Threads data is missing in reply data');
      return api.sendMessage('❌ Error: Thread data is missing.', threadID, messageID);
    }
    
    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to perform this action.', threadID, messageID);
    }
    
    // Parse the reply format: "[index] [action]"
    const parts = body.trim().split(/\s+/);
    if (parts.length !== 2) {
      return api.sendMessage('❌ Invalid format. Use "[index] [action]".', threadID, messageID);
    }
    
    const index = parseInt(parts[0]);
    const action = parts[1].toLowerCase();
    
    // Validate index
    if (isNaN(index) || index < 1 || index > threads.length) {
      return api.sendMessage(`❌ Invalid index. Please provide a number between 1 and ${threads.length}.`, threadID, messageID);
    }
    
    // Get the selected thread
    const selectedThread = threads[index - 1];
    
    // Perform the requested action
    try {
      switch (action) {
        case 'ban':
          await this.banThread(api, message, selectedThread);
          break;
        case 'unban':
          await this.unbanThread(api, message, selectedThread);
          break;
        case 'out':
          await this.leaveThread(api, message, selectedThread);
          break;
        default:
          return api.sendMessage('❌ Invalid action. Use "ban", "unban", or "out".', threadID, messageID);
      }
    } catch (error) {
      global.logger.error(`Error performing ${action} action:`, error);
      return api.sendMessage(`❌ An error occurred while performing the ${action} action.`, threadID, messageID);
    }
  },
  
  /**
   * Ban a thread
   * @param {Object} api - Facebook API instance
   * @param {Object} message - Message object
   * @param {Object} thread - Thread to ban
   */
  banThread: async function(api, message, thread) {
    const { threadID, messageID } = message;
    
    // Check if thread is already banned
    if (thread.isBanned) {
      return api.sendMessage(`❌ Thread "${thread.threadName}" is already banned.`, threadID, messageID);
    }
    
    // Update thread in database
    await global.Thread.updateOne(
      { threadID: thread.threadID },
      { $set: { isBanned: true, banReason: 'Banned via thread command' } }
    );
    
    // Send success message
    api.sendMessage(`✅ Successfully banned thread "${thread.threadName}".`, threadID, messageID);
    
    // Notify the banned thread
    api.sendMessage(
      '🚫 This thread has been banned from using the bot. Contact an admin if you believe this is a mistake.',
      thread.threadID
    );
  },
  
  /**
   * Unban a thread
   * @param {Object} api - Facebook API instance
   * @param {Object} message - Message object
   * @param {Object} thread - Thread to unban
   */
  unbanThread: async function(api, message, thread) {
    const { threadID, messageID } = message;
    
    // Check if thread is already unbanned
    if (!thread.isBanned) {
      return api.sendMessage(`❌ Thread "${thread.threadName}" is not banned.`, threadID, messageID);
    }
    
    // Update thread in database
    await global.Thread.updateOne(
      { threadID: thread.threadID },
      { $set: { isBanned: false, banReason: null } }
    );
    
    // Send success message
    api.sendMessage(`✅ Successfully unbanned thread "${thread.threadName}".`, threadID, messageID);
    
    // Notify the unbanned thread
    api.sendMessage(
      '✅ This thread has been unbanned and can now use the bot again.',
      thread.threadID
    );
  },
  
  /**
   * Leave a thread
   * @param {Object} api - Facebook API instance
   * @param {Object} message - Message object
   * @param {Object} thread - Thread to leave
   */
  leaveThread: async function(api, message, thread) {
    const { threadID, messageID } = message;
    
    // Log the action
    global.logger.system(`Attempting to leave thread ${thread.threadID} (${thread.threadName})`);
    
    // First, try to remove the thread from database before leaving
    try {
      // Remove thread from database
      const deleteResult = await global.Thread.deleteOne({ threadID: thread.threadID });
      global.logger.debug(`Database deletion result for thread ${thread.threadID}: ${JSON.stringify(deleteResult)}`);
      
      if (deleteResult.deletedCount > 0) {
        global.logger.system(`Successfully removed thread ${thread.threadID} from database`);
      } else {
        global.logger.warn(`Thread ${thread.threadID} not found in database or not deleted`);
      }
    } catch (dbError) {
      global.logger.error(`Error removing thread ${thread.threadID} from database:`, dbError);
    }
    
    // Send goodbye message to the thread
    api.sendMessage(
      '👋 I have been instructed to leave this thread. Goodbye!',
      thread.threadID,
      async () => {
        // Leave the thread
        api.removeUserFromGroup(api.getCurrentUserID(), thread.threadID, (err) => {
          if (err) {
            global.logger.error(`Error leaving thread ${thread.threadID}:`, err);
            return api.sendMessage(`❌ Failed to leave thread "${thread.threadName}".`, threadID, messageID);
          }
          
          // Double-check database removal
          global.Thread.findOne({ threadID: thread.threadID }).then(foundThread => {
            if (foundThread) {
              global.logger.warn(`Thread ${thread.threadID} still exists in database after leaving. Attempting to remove again...`);
              global.Thread.deleteOne({ threadID: thread.threadID }).then(result => {
                global.logger.debug(`Second deletion attempt result: ${JSON.stringify(result)}`);
              }).catch(err => {
                global.logger.error(`Error in second deletion attempt: ${err.message}`);
              });
            }
          }).catch(err => {
            global.logger.error(`Error checking thread existence: ${err.message}`);
          });
          
          // Send success message
          api.sendMessage(`✅ Successfully left thread "${thread.threadName}" and removed from database.`, threadID, messageID);
        });
      }
    );
  }
};