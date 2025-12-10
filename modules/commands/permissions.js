/**
 * Command: permissions
 * Description: Check a user's permission level
 * Usage: {prefix}permissions [userID]
 * Permissions: PUBLIC
 */

module.exports = {
  config: {
    name: 'permissions',
    aliases: ['perms', 'permcheck'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'ADMIN',
    description: 'Check a user\'s permission level',
    usage: '{prefix}permissions [userID] or {prefix}permissions @mention',
    cooldown: 5,
    permission: 'PUBLIC'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;
    
    // Determine which user to check
    let targetID = senderID; // Default to the sender
    let targetMention = "You have";
    
    // If a user ID is provided as an argument
    if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
      targetMention = `User ${targetID} has`;
    }
    // If a user is mentioned
    else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      targetMention = `${mentions[targetID].replace('@', '')} has`;
    }
    
    try {
      // Set reaction to indicate processing
      api.setMessageReaction("⏳", messageID, () => {}, true);
      
      // Check permissions
      const isOwner = targetID === global.config.ownerID;
      const isAdmin = isOwner || global.config.adminIDs.includes(targetID);
      const isSupporter = isAdmin || global.config.supportIDs.includes(targetID);
      
      // Get user info if possible
      let userName = targetID;
      if (targetID !== senderID) {
        try {
          const userInfo = await api.getUserInfo(targetID);
          if (userInfo && userInfo[targetID]) {
            userName = userInfo[targetID].name || targetID;
          }
        } catch (error) {
          global.logger.warn(`Could not fetch user info for ${targetID}: ${error.message}`);
        }
      } else {
        userName = "You";
      }
      
      // Determine the highest permission level
      let permissionLevel = "PUBLIC";
      let permissionEmoji = "👤";
      
      if (isOwner) {
        permissionLevel = "OWNER";
        permissionEmoji = "👑";
      } else if (isAdmin) {
        permissionLevel = "ADMIN";
        permissionEmoji = "⭐";
      } else if (isSupporter) {
        permissionLevel = "SUPPORTER";
        permissionEmoji = "🔧";
      }
      
      // Check if user is banned
      const User = global.User;
      const user = await User.findOne({ userID: targetID });
      let banStatus = "";
      
      if (user && user.isBanned) {
        banStatus = `\n\n⛔ This user is banned from using the bot.\nReason: ${user.banReason || 'No reason provided'}`;
      }
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        `${permissionEmoji} Permission Check:\n\n${userName} has permission level: ${permissionLevel}${banStatus}`,
        threadID,
        messageID
      );
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error(`Error in permissions command: ${error.message}`);
      return api.sendMessage(
        `❌ Error checking permissions: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};