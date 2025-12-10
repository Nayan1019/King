/**
 * Command: addsupporter
 * Description: Adds a new supporter to the bot
 * Usage: {prefix}addsupporter [userID]
 * Permissions: ADMIN
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'addsupporter',
    aliases: ['supporteradd'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: 'Adds a user to the supporter list',
    usage: '{prefix}addsupporter [userID] or {prefix}addsupporter @mention',
    cooldown: 5,
    permission: 'ADMIN',
    category: 'ADMIN'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;
    
    // Check if user has permission
    const hasPermission = await global.permissions.check(senderID, this.config.permission);
    if (!hasPermission) {
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can add supporters.',
        threadID,
        messageID
      );
    }
    
    // Get userID from mentions or args
    let userID;
    
    // Check if there's a mention
    if (Object.keys(mentions).length > 0) {
      userID = Object.keys(mentions)[0];
    } 
    // Check if userID is provided as argument
    else if (args[0]) {
      userID = args[0];
    } 
    // No userID provided
    else {
      return api.sendMessage(
        `❌ Missing user ID to add as supporter\nUsage: ${global.config.prefix}${this.config.usage.replace('{prefix}', '')} [userID] or ${global.config.prefix}${this.config.name} @mention`,
        threadID,
        messageID
      );
    }
    
    // Validate userID format (simple check)
    if (!/^\d+$/.test(userID)) {
      return api.sendMessage(
        '❌ Invalid user ID format. User ID should contain only numbers.',
        threadID,
        messageID
      );
    }
    
    try {
      // Set reaction to indicate processing
      api.setMessageReaction("⏳", messageID, () => {}, true);
      
      // Read current config
      const configPath = path.join(__dirname, '../../config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check if user is already a supporter or admin
      if (config.supportIDs.includes(userID)) {
        api.setMessageReaction("ℹ️", messageID, () => {}, true);
        return api.sendMessage(
          `ℹ️ User ${userID} is already a supporter.`,
          threadID,
          messageID
        );
      }
      
      if (config.adminIDs.includes(userID) || userID === config.ownerID) {
        api.setMessageReaction("ℹ️", messageID, () => {}, true);
        return api.sendMessage(
          `ℹ️ User ${userID} is already an administrator or owner and has higher permissions.`,
          threadID,
          messageID
        );
      }
      
      // Add user to supportIDs
      config.supportIDs.push(userID);
      
      // Save updated config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Update global config
      global.config = config;
      
      // Try to get user info
      let userName = userID;
      try {
        const userInfo = await api.getUserInfo(userID);
        if (userInfo && userInfo[userID]) {
          userName = userInfo[userID].name || userID;
        }
      } catch (error) {
        global.logger.warn(`Could not fetch user info for ${userID}: ${error.message}`);
      }
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        `✅ Successfully added ${userName} (${userID}) as a supporter.`,
        threadID,
        messageID
      );
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error(`Error in addsupporter command: ${error.message}`);
      return api.sendMessage(
        `❌ Error adding supporter: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};