/**
 * Nickname Command
 * Allows users to set, view, or remove nicknames in group chats
 */

module.exports = {
  config: {
    name: 'nickname',
    aliases: ['nick'],
    description: 'Manage nicknames in group chats',
    usage: '{prefix}nickname [@mention] [nickname]',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'GROUP',
    hasPrefix: true,
    permission: 'PUBLIC',
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
    const { threadID, senderID, mentions } = message;
    
    // Check if this is a group chat
    const threadInfo = await global.Thread.findOne({ threadID });
    if (!threadInfo) {
      return global.api.sendMessage("⚠️ Error: Could not retrieve thread information.", threadID, message.messageID);
    }
    
    // If no arguments, show current nickname
    if (args.length === 0) {
      const userInfo = threadInfo.users.find(user => user.id === senderID);
      if (!userInfo) {
        return global.api.sendMessage("⚠️ Error: Could not find your user information.", threadID, message.messageID);
      }
      
      const currentNickname = userInfo.nickname;
      if (currentNickname) {
        return global.api.sendMessage(`Your current nickname is: ${currentNickname}`, threadID, message.messageID);
      } else {
        return global.api.sendMessage("You don't have a nickname set in this group.", threadID, message.messageID);
      }
    }
    
    // If mentions, set nickname for mentioned user
    if (Object.keys(mentions).length > 0) {
      const mentionID = Object.keys(mentions)[0];
      const nickname = args.join(' ').replace(mentions[mentionID], '').trim();
      
      try {
        // Set nickname using Facebook API
        await global.api.changeNickname(
          nickname, 
          threadID, 
          mentionID,
          (err) => {
            if (err) {
              global.logger.error(`Error setting nickname: ${err.message}`);
              return global.api.sendMessage("⚠️ Error setting nickname. Please try again later.", threadID, message.messageID);
            }
          }
        );
        
        if (nickname) {
          return global.api.sendMessage(`✅ Nickname for ${mentions[mentionID].replace('@', '')} has been set to: ${nickname}`, threadID, message.messageID);
        } else {
          return global.api.sendMessage(`✅ Nickname for ${mentions[mentionID].replace('@', '')} has been removed.`, threadID, message.messageID);
        }
      } catch (error) {
        global.logger.error(`Error in nickname command: ${error.message}`);
        return global.api.sendMessage("⚠️ An error occurred while setting the nickname.", threadID, message.messageID);
      }
    } else {
      // If no mentions but has args, set nickname for self
      const nickname = args.join(' ').trim();
      
      try {
        // Set nickname using Facebook API
        await global.api.changeNickname(
          nickname, 
          threadID, 
          senderID,
          (err) => {
            if (err) {
              global.logger.error(`Error setting nickname: ${err.message}`);
              return global.api.sendMessage("⚠️ Error setting nickname. Please try again later.", threadID, message.messageID);
            }
          }
        );
        
        if (nickname) {
          return global.api.sendMessage(`✅ Your nickname has been set to: ${nickname}`, threadID, message.messageID);
        } else {
          return global.api.sendMessage(`✅ Your nickname has been removed.`, threadID, message.messageID);
        }
      } catch (error) {
        global.logger.error(`Error in nickname command: ${error.message}`);
        return global.api.sendMessage("⚠️ An error occurred while setting the nickname.", threadID, message.messageID);
      }
    }
  }
};