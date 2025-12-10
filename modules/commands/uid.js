/**
 * UID Command
 * Gets the user ID of a mentioned user, reply to a message, or from a Facebook profile link
 */

module.exports = {
  config: {
    name: 'uid',
    aliases: ['userid', 'getuid'],
    description: 'Get the user ID of a mentioned user, reply to a message, or from a Facebook profile link',
    usage: '{prefix}uid [@mention] or {prefix}uid [reply to a message] or {prefix}uid [fb_profile_link]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'USER',
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
    const { threadID, messageID, senderID, mentions, messageReply } = message;
    
    try {
      // Case 1: User mentioned someone
      if (Object.keys(mentions).length > 0) {
        const targetID = Object.keys(mentions)[0];
        const targetName = mentions[targetID].replace('@', '');
        
        return api.sendMessage(
          `👤 User: ${targetName}\n🆔 UID: ${targetID}`,
          threadID, messageID
        );
      }
      
      // Case 2: User replied to a message
      if (messageReply) {
        const targetID = messageReply.senderID;
        
        // Get user info
        const userInfo = await api.getUserInfo(targetID);
        const targetName = userInfo[targetID].name || 'Facebook User';
        
        return api.sendMessage(
          `👤 User: ${targetName}\n🆔 UID: ${targetID}`,
          threadID, messageID
        );
      }
      
      // Case 3: User provided a Facebook profile link
      if (args.length > 0 && args[0].match(/(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/(?:profile\.php\?id=|[\w.]+)/)) {
        const profileLink = args[0];
        let fbID = '';
        
        // Extract ID from profile link
        if (profileLink.includes('profile.php?id=')) {
          fbID = profileLink.split('profile.php?id=')[1].split('&')[0];
        } else {
          // For vanity URLs, we would need to make an API call to get the ID
          // This is a simplified version that may not work for all cases
          return api.sendMessage(
            '❌ Could not extract UID from this profile link. Please use a direct profile.php?id= link or mention the user.',
            threadID, messageID
          );
        }
        
        if (fbID) {
          try {
            // Verify the ID by getting user info
            const userInfo = await api.getUserInfo(fbID);
            const targetName = userInfo[fbID].name || 'Facebook User';
            
            return api.sendMessage(
              `👤 User: ${targetName}\n🆔 UID: ${fbID}`,
              threadID, messageID
            );
          } catch (error) {
            return api.sendMessage(
              '❌ Invalid Facebook ID or profile link.',
              threadID, messageID
            );
          }
        }
      }
      
      // Case 4: No arguments, return sender's ID
      if (args.length === 0 && !messageReply) {
        const userInfo = await api.getUserInfo(senderID);
        const userName = userInfo[senderID].name || 'Facebook User';
        
        return api.sendMessage(
          `👤 User: ${userName}\n🆔 UID: ${senderID}`,
          threadID, messageID
        );
      }
      
      // Invalid usage
      return api.sendMessage(
        '❓ Usage:\n' +
        '- {prefix}uid [@mention]\n' +
        '- {prefix}uid (reply to a message)\n' +
        '- {prefix}uid [Facebook profile link]\n' +
        '- {prefix}uid (to get your own UID)',
        threadID, messageID
      );
      
    } catch (error) {
      global.logger.error('Error in uid command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};