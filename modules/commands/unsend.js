/**
 * Unsend Command
 * Unsends a bot message when replied to
 */

module.exports = {
  config: {
    name: 'unsend',
    aliases: ['delete'],
    description: 'Unsends a bot message when replied to',
    usage: '{prefix}unsend (reply to a bot message)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 3
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, messageReply } = message;
    
    try {
      // Check if the command is a reply to a message
      if (!messageReply) {
        return api.sendMessage(
          '❌ You must reply to a bot message to unsend it.',
          threadID,
          messageID
        );
      }
      
      // Check if the replied message is from the bot
      if (messageReply.senderID !== api.getCurrentUserID()) {
        return api.sendMessage(
          '❌ I can only unsend my own messages.',
          threadID,
          messageID
        );
      }
      
      // Try to unsend the message
      api.unsendMessage(messageReply.messageID, (err) => {
        if (err) {
          global.logger.error('Error unsending message:', err);
          api.sendMessage(
            '❌ Failed to unsend the message. It might be too old (Facebook only allows unsending messages sent within the last 10 minutes).',
            threadID,
            messageID
          );
        }
        // No success message to keep the command clean
      });
      
    } catch (error) {
      global.logger.error('Error in unsend command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};