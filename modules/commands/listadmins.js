/**
 * Command: listadmins
 * Description: Lists all administrators of the bot
 * Usage: {prefix}listadmins
 * Permissions: PUBLIC
 */

module.exports = {
  config: {
    name: 'listadmins',
    aliases: ['admins', 'adminlist'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'GENERAL',
    description: 'Lists all administrators of the bot',
    usage: '{prefix}listadmins',
    cooldown: 5,
    permission: 'PUBLIC'
  },
  
  run: async function({ api, message }) {
    const { threadID, messageID } = message;
    
    try {
      // Set reaction to indicate processing
      api.setMessageReaction("⏳", messageID, () => {}, true);
      
      // Get admin IDs from config
      const ownerID = global.config.ownerID;
      const adminIDs = global.config.adminIDs || [];
      const supportIDs = global.config.supportIDs || [];
      
      // Fetch user info for all admins
      const allAdminIDs = [ownerID, ...adminIDs, ...supportIDs].filter((id, index, self) => {
        return self.indexOf(id) === index; // Remove duplicates
      });
      
      let adminInfo = {};
      try {
        // Get user info one by one to avoid errors with multiple IDs
        for (const id of allAdminIDs) {
          try {
            const info = await api.getUserInfo([id]);
            if (info && info[id]) {
              adminInfo[id] = info[id];
            }
          } catch (userError) {
            global.logger.warn(`Could not fetch info for user ${id}: ${userError.message}`);
          }
        }
      } catch (error) {
        global.logger.warn(`Could not fetch all admin info: ${error.message}`);
      }
      
      // Format the admin list
      let message = "👑 Bot Administrators:\n\n";
      
      // Owner
      const ownerName = (adminInfo[ownerID]?.name) || ownerID;
      message += `👑 Owner: ${ownerName} (${ownerID})\n\n`;
      
      // Admins
      if (adminIDs.length > 0) {
        message += "⭐ Administrators:\n";
        for (const id of adminIDs) {
          if (id === ownerID) continue; // Skip owner if they're also in adminIDs
          const name = (adminInfo[id]?.name) || id;
          message += `- ${name} (${id})\n`;
        }
        message += "\n";
      }
      
      // Supporters
      if (supportIDs.length > 0) {
        message += "🔧 Supporters:\n";
        for (const id of supportIDs) {
          // Skip if already listed as owner or admin
          if (id === ownerID || adminIDs.includes(id)) continue;
          const name = (adminInfo[id]?.name) || id;
          message += `- ${name} (${id})\n`;
        }
      }
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(message, threadID, messageID);
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error(`Error in listadmins command: ${error.message}`);
      return api.sendMessage(
        `❌ Error listing administrators: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};