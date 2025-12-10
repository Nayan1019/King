/**
 * Share Contact Command
 * Share a Facebook user's contact card in a thread
 */

module.exports = {
  config: {
    name: 'sharecontact',
    aliases: ['contact', 'share'],
    description: 'Share a Facebook user contact card',
    usage: '{prefix}sharecontact <uid> [message]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'UTILITY'
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
    
    // Check if shareContact API is available
    if (!api.shareContact) {
      return api.sendMessage('❌ ShareContact API is not available.', threadID, messageID);
    }
    
    // Show help if no arguments
    if (args.length === 0) {
      const helpMessage = `📱 Share Contact Command Help\n\n` +
        `📌 Usage:\n` +
        `/sharecontact <uid> [message] - Share a user's contact\n` +
        `/sharecontact me - Share your own contact\n\n` +
        `💡 Examples:\n` +
        `/sharecontact 100037743553265\n` +
        `/sharecontact 100037743553265 Ye mera dost hai\n` +
        `/sharecontact me`;
      
      return api.sendMessage(helpMessage, threadID, messageID);
    }
    
    try {
      let contactID;
      let messageText = '';
      
      // Check if user wants to share their own contact
      if (args[0].toLowerCase() === 'me') {
        contactID = senderID;
        messageText = args.slice(1).join(' ') || 'Ye mera contact hai!';
      } else {
        // Get contact ID from args
        contactID = args[0];
        messageText = args.slice(1).join(' ') || '';
        
        // Validate UID (should be numeric)
        if (!/^\d+$/.test(contactID)) {
          return api.sendMessage('❌ Invalid user ID. Please provide a valid numeric Facebook UID.', threadID, messageID);
        }
      }
      
      // Send loading message
      api.sendMessage(`📱 Sharing contact ${contactID}...`, threadID, messageID);
      
      // Share the contact
      api.shareContact(messageText, contactID, threadID, (err, data) => {
        if (err) {
          global.logger.error('ShareContact error:', err);
          return api.sendMessage(
            '❌ Failed to share contact. Possible reasons:\n' +
            '- Invalid user ID\n' +
            '- MQTT connection not active\n' +
            '- User privacy settings\n' +
            '- Network issue',
            threadID, messageID
          );
        }
        
        global.logger.system(`✅ Contact ${contactID} shared to thread ${threadID}`);
        
        // Success - no need to send message as contact card is already sent
        // Just log it
      });
      
    } catch (error) {
      global.logger.error('ShareContact command error:', error);
      return api.sendMessage('❌ An error occurred: ' + error.message, threadID, messageID);
    }
  }
};
