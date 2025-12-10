/**
 * Reset My Currency Command
 * Allows users to reset their own currency data
 */

module.exports = {
  config: {
    name: 'resetmycurrency',
    aliases: ['resetmymoney', 'resetme'],
    description: 'Reset your currency data to default values',
    usage: '{prefix}resetmycurrency',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 300 // 5 minutes cooldown
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
      // Check if user exists
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ Your user data was not found in the database.', threadID, messageID);
      }
      
      // Ask for confirmation
      api.sendMessage(
        '⚠️ WARNING: This will reset your currency data to default values. ' +
        'You will lose all your money, bank balance, level, and experience. ' +
        'This action cannot be undone.\n\n' +
        'Reply with "CONFIRM" to proceed or anything else to cancel.',
        threadID,
        (err, info) => {
          if (err) return global.logger.error('Error sending confirmation message:', err);
          
          // Store reply handler
          global.client.replies = global.client.replies || new Map();
          global.client.replies.set(threadID, {
            name: this.config.name,
            author: senderID,
            messageID: info.messageID,
            type: 'resetmycurrency'
          });
        },
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in resetmycurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Handle reply for this command
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.reply - Reply data
   */
  handleReply: async function({ api, message, reply }) {
    const { threadID, messageID, senderID, body } = message;
    
    // Check if the reply is from the same user who initiated the command
    if (senderID !== reply.author) return;
    
    try {
      // Check if user confirmed
      if (body.trim().toUpperCase() === 'CONFIRM') {
        // Delete existing currency record
        await global.Currency.deleteOne({ userID: senderID });
        
        // Create new currency record with default values
        await global.Currency.create({
          userID: senderID,
          exp: 0,
          level: 1,
          money: 100, // Start with 100 coins
          bank: 0,
          bankCapacity: 5000,
          lastUpdated: new Date()
        });
        
        return api.sendMessage(
          '✅ Your currency data has been reset to default values:\n\n' +
          '💰 Money: 100 coins\n' +
          '🏦 Bank: 0/5000 coins\n' +
          '⭐ Level: 1\n' +
          '📊 EXP: 0',
          threadID,
          messageID
        );
      } else {
        // User canceled
        return api.sendMessage('❌ Currency reset canceled.', threadID, messageID);
      }
    } catch (error) {
      global.logger.error('Error in resetmycurrency handleReply:', error.message);
      return api.sendMessage('❌ An error occurred while resetting your currency data.', threadID, messageID);
    }
  }
};