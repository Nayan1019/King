/**
 * Reply Handler
 * Handles reply-based conversations
 */

/**
 * Handle reply execution
 * @param {Object} options - Options object
 * @param {Object} options.api - Facebook API instance
 * @param {Object} options.message - Message object
 */
module.exports = async function({ api, message }) {
  try {
    // Extract message data
    const { body, senderID, threadID, messageID, messageReply } = message;
    
    // Check if this is actually a reply (has messageReply)
    if (!messageReply || !messageReply.messageID) {
      return; // Not a reply, skip processing
    }
    
    // Check if commands are enabled (replies are part of command system)
    if (!global.config.commandEnabled) {
      return global.logger.debug('Commands are disabled, skipping reply handler');
    }
    
    // Check if user is banned
    const user = await global.User.findOne({ userID: senderID });
    if (user && user.isBanned) {
      return global.logger.debug(`Skipping reply from banned user ${senderID}`);
    }
    
    // Check if thread is banned
    const thread = await global.Thread.findOne({ threadID });
    if (thread && thread.isBanned) {
      return global.logger.debug(`Skipping reply in banned thread ${threadID}`);
    }
    
    // Get reply handler from client
    const pendingReplies = global.client.replies.get(threadID) || [];
    
    // Find matching reply handler
    const replyHandler = pendingReplies.find(reply => 
      reply.messageID === messageReply.messageID && 
      reply.command && 
      (!reply.expectedSender || reply.expectedSender === senderID)
    );
    
    if (!replyHandler) {
      return;
    }
    
    // Get command for this reply
    const command = global.client.commands.get(replyHandler.command);
    if (!command || !command.handleReply) {
      return global.logger.warn(`Command ${replyHandler.command} has no handleReply method`);
    }
    
    // Log reply handling
    global.logger.command(`${senderID} replied to command ${replyHandler.command} in thread ${threadID}`);
    
    // Execute reply handler
    await command.handleReply({ 
      api, 
      message, 
      args: body.split(/\s+/),
      replyData: replyHandler.data || {}
    });
    
    // Remove this reply handler if it's not persistent
    if (!replyHandler.persistent) {
      const updatedReplies = pendingReplies.filter(reply => 
        reply.messageID !== messageReply.messageID
      );
      
      if (updatedReplies.length > 0) {
        global.client.replies.set(threadID, updatedReplies);
      } else {
        global.client.replies.delete(threadID);
      }
    }
    
    // Update last active time
    await global.User.findOneAndUpdate(
      { userID: senderID },
      { lastActive: new Date() },
      { new: true }
    );
    
    await global.Thread.findOneAndUpdate(
      { threadID },
      { lastActive: new Date() },
      { new: true }
    );
    
  } catch (error) {
    global.logger.error('Error handling reply:', error);
  }
};

/**
 * Create a reply handler
 * @param {Object} options - Options object
 * @param {string} options.threadID - Thread ID
 * @param {string} options.messageID - Message ID to listen for replies to
 * @param {string} options.command - Command name that will handle the reply
 * @param {string} [options.expectedSender] - User ID expected to reply (optional)
 * @param {Object} [options.data] - Additional data to pass to the reply handler
 * @param {boolean} [options.persistent=false] - Whether this reply handler persists after being triggered
 */
module.exports.createReply = function({ threadID, messageID, command, expectedSender, data, persistent = false }) {
  // Get existing replies for this thread or create new array
  const pendingReplies = global.client.replies.get(threadID) || [];
  
  // Add new reply handler
  pendingReplies.push({
    messageID,
    command,
    expectedSender,
    data,
    persistent,
    createdAt: Date.now()
  });
  
  // Update replies map
  global.client.replies.set(threadID, pendingReplies);
  
  // Set timeout to clean up old reply handlers (30 minutes)
  setTimeout(() => {
    const currentReplies = global.client.replies.get(threadID) || [];
    const updatedReplies = currentReplies.filter(reply => 
      reply.messageID !== messageID
    );
    
    if (updatedReplies.length > 0) {
      global.client.replies.set(threadID, updatedReplies);
    } else {
      global.client.replies.delete(threadID);
    }
  }, 30 * 60 * 1000);
};