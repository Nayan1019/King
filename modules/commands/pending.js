/**
 * Pending Command
 * Displays and approves pending message requests for threads and users
 */

module.exports = {
  config: {
    name: 'pending',
    aliases: ['requests', 'msgRequests'],
    description: 'Shows and approves pending message requests',
    usage: '{prefix}pending [thread/user]',
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
    
    // Default to thread if no argument provided
    const type = args[0]?.toLowerCase() || 'thread';
    
    if (type !== 'thread' && type !== 'user') {
      return api.sendMessage(
        '❌ Invalid type. Use: \n' +
        '- pending thread: Show pending group message requests\n' +
        '- pending user: Show pending user message requests',
        threadID, messageID
      );
    }
    
    try {
      // Get ALL pending message requests (fetch in batches)
      const getAllPendingRequests = async () => {
        let allRequests = [];
        let offset = null;
        let hasMore = true;
        
        while (hasMore) {
          await new Promise((resolve, reject) => {
            api.getThreadList(100, offset, ['PENDING'], (err, list) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (list.length === 0) {
                hasMore = false;
              } else {
                allRequests = allRequests.concat(list);
                offset = list[list.length - 1].timestamp;
                
                // If we got less than 100, we've reached the end
                if (list.length < 100) {
                  hasMore = false;
                }
              }
              
              resolve();
            });
          }).catch((err) => {
            global.logger.error('Error getting pending requests batch:', err);
            hasMore = false;
          });
        }
        
        return allRequests;
      };
      
      const allPendingRequests = await getAllPendingRequests();
      
      // Filter based on type (thread or user)
      const pendingList = allPendingRequests.filter(item => {
        if (type === 'thread') return item.isGroup;
        if (type === 'user') return !item.isGroup;
        return false;
      });
      
      if (pendingList.length === 0) {
        return api.sendMessage(`✅ No pending ${type} message requests.`, threadID, messageID);
      }
      
      // Split into pages if there are too many (max 30 per page for readability)
      const pageSize = 30;
      const totalPages = Math.ceil(pendingList.length / pageSize);
      const page = parseInt(args[1]) || 1;
      
      if (page < 1 || page > totalPages) {
        return api.sendMessage(`❌ Invalid page number. Total pages: ${totalPages}`, threadID, messageID);
      }
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, pendingList.length);
      const pageItems = pendingList.slice(startIndex, endIndex);
      
      // Format the list with index numbers
      let msg = `📋 Pending ${type} message requests (Page ${page}/${totalPages}):\n`;
      msg += `Total: ${pendingList.length} requests\n\n`;
      
      pageItems.forEach((item, index) => {
        const globalIndex = startIndex + index + 1;
        msg += `${globalIndex}. ${item.name || 'Unknown'} (${item.threadID})\n`;
      });
      
      if (totalPages > 1) {
        msg += `\n📄 Use "${global.config.prefix}pending ${type} [page]" to see other pages.`;
      }
      msg += '\n👉 Reply with the number(s) to approve specific requests (e.g., "1 2 3").';
      
      // Send the list and store the reply handler
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);
        
        // Store ALL pending list (not just current page) for approval
        global.client.replies.set(threadID, [
          ...(global.client.replies.get(threadID) || []),
          {
            messageID: info.messageID,
            command: this.config.name,
            expectedSender: senderID,
            data: {
              pendingList, // Store all pending requests, not just the page
              type
            }
          }
        ]);
      });
    } catch (error) {
      global.logger.error('Error in pending command:', error);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Handle replies to the pending list
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.replyData - Data from the original message
   */
  handleReply: async function({ api, message, replyData }) {
    const { threadID, messageID, body, senderID } = message;
    
    // Check if replyData exists and has the required properties
    if (!replyData) {
      global.logger.debug('Reply data is undefined');
      return api.sendMessage('❌ Error: Reply data is missing.', threadID, messageID);
    }
    
    // Log the replyData for debugging
    global.logger.debug('Reply data received:', JSON.stringify(replyData));
    
    // Access pendingList and type from replyData.data
    if (!replyData.pendingList && (!replyData.data || !replyData.data.pendingList || !replyData.data.type)) {
      return api.sendMessage('❌ Error: Pending list data is missing.', threadID, messageID);
    }
    
    // Extract data from either replyData or replyData.data
    const pendingList = replyData.pendingList || replyData.data.pendingList;
    const type = replyData.type || replyData.data.type;
    
    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to approve requests.', threadID, messageID);
    }
    
    // Parse the numbers from the reply
    const selectedIndexes = body.split(/\s+/).map(num => parseInt(num.trim()));
    
    // Filter out invalid numbers
    const validIndexes = selectedIndexes.filter(num => 
      !isNaN(num) && num > 0 && num <= pendingList.length
    );
    
    if (validIndexes.length === 0) {
      return api.sendMessage('❌ Invalid selection. Please provide valid numbers.', threadID, messageID);
    }
    
    // Process each selected request
    let approvedCount = 0;
    let failedCount = 0;
    
    // Send processing message
    api.sendMessage(`⏳ Processing ${validIndexes.length} request(s)...`, threadID, messageID);
    
    for (const index of validIndexes) {
      const request = pendingList[index - 1];
      
      try {
        // Approve the message request
        await new Promise((resolve, reject) => {
          api.handleMessageRequest(request.threadID, true, (err) => {
            if (err) {
              global.logger.error(`Error approving request ${request.threadID}:`, err);
              failedCount++;
              reject(err);
            } else {
              approvedCount++;
              
              // Send welcome message to group chats only
              if (type === 'thread') {
                api.sendMessage(
                  `👋 Hello everyone! I'm a bot and I've approved this group chat request.\n\nUse ${global.config.prefix}help to see available commands.`,
                  request.threadID
                );
              }
              
              resolve();
            }
          });
        }).catch(() => {});
      } catch (error) {
        global.logger.error(`Error processing request ${request.threadID}:`, error);
        failedCount++;
      }
    }
    
    // Send summary message
    let resultMsg = `✅ Results:\n`;
    resultMsg += `- Approved: ${approvedCount}\n`;
    
    if (failedCount > 0) {
      resultMsg += `- Failed: ${failedCount}\n`;
    }
    
    api.sendMessage(resultMsg, threadID);
  }
};