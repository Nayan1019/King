/**
 * Command: config
 * Description: View and modify bot configuration settings
 * Usage: {prefix}config [view/set] [key] [value]
 * Permissions: ADMIN
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'config',
    aliases: ['settings', 'configuration'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: 'View and modify bot configuration settings',
    usage: '{prefix}config [view/set] [key] [value]',
    cooldown: 5,
    permission: 'ADMIN',
    category: 'SYSTEM'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check if user has permission
    const hasPermission = await global.permissions.check(senderID, this.config.permission);
    if (!hasPermission) {
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can view or modify configuration.',
        threadID,
        messageID
      );
    }
    
    // If no arguments, show usage
    if (args.length === 0) {
      return api.sendMessage(
        `⚙️ Config Command Usage:\n` +
        `- ${global.config.prefix}config view: View all configuration settings\n` +
        `- ${global.config.prefix}config view [key]: View a specific configuration setting\n` +
        `- ${global.config.prefix}config set [key] [value]: Modify a configuration setting\n\n` +
        `Available settings: prefix, commandEnabled, eventEnabled, debug, announceImageChange, announceNameChange, announceNicknameChange`,
        threadID,
        messageID
      );
    }
    
    const action = args[0].toLowerCase();
    
    // Handle view action
    if (action === 'view') {
      try {
        // Set reaction to indicate processing
        api.setMessageReaction("⏳", messageID, () => {}, true);
        
        // Read current config
        const configPath = path.join(__dirname, '../../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // If a specific key is provided
        if (args[1]) {
          const key = args[1];
          
          // Check if key exists
          if (config[key] === undefined) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(
              `❌ Configuration key "${key}" does not exist.`,
              threadID,
              messageID
            );
          }
          
          // Format the value for display
          let value = config[key];
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
          }
          
          api.setMessageReaction("✅", messageID, () => {}, true);
          return api.sendMessage(
            `⚙️ Configuration: ${key}\n\n${value}`,
            threadID,
            messageID
          );
        }
        
        // Otherwise, show all safe configuration settings
        const safeConfig = { ...config };
        
        // Remove sensitive information
        delete safeConfig.mongoURI;
        delete safeConfig.ownerID;
        delete safeConfig.adminIDs;
        delete safeConfig.supportIDs;
        
        // Format the output
        let message = "⚙️ Bot Configuration:\n\n";
        
        for (const [key, value] of Object.entries(safeConfig)) {
          if (typeof value === 'object') {
            message += `${key}: [Object]\n`;
          } else {
            message += `${key}: ${value}\n`;
          }
        }
        
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage(message, threadID, messageID);
      } catch (error) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        global.logger.error(`Error in config view command: ${error.message}`);
        return api.sendMessage(
          `❌ Error viewing configuration: ${error.message}`,
          threadID,
          messageID
        );
      }
    }
    
    // Handle set action
    if (action === 'set') {
      // Check if key and value are provided
      if (!args[1] || !args[2]) {
        return api.sendMessage(
          `❌ Missing key or value\nUsage: ${global.config.prefix}config set [key] [value]`,
          threadID,
          messageID
        );
      }
      
      const key = args[1];
      let value = args.slice(2).join(' ');
      
      // List of allowed keys to modify
      const allowedKeys = [
        'prefix', 'commandEnabled', 'eventEnabled', 'debug',
        'announceImageChange', 'announceNameChange', 'announceNicknameChange',
        'botNickname'
      ];
      
      // Check if key is allowed to be modified
      if (!allowedKeys.includes(key)) {
        return api.sendMessage(
          `❌ Cannot modify "${key}" setting. Only the following settings can be modified:\n${allowedKeys.join(', ')}`,
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
        
        // Convert value to appropriate type
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value.trim() !== '') value = Number(value);
        
        // Store old value for message
        const oldValue = config[key];
        
        // Update config
        config[key] = value;
        
        // Save updated config
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        
        // Update global config
        global.config = config;
        
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage(
          `✅ Successfully updated configuration\n\nKey: ${key}\nOld value: ${oldValue}\nNew value: ${value}`,
          threadID,
          messageID
        );
      } catch (error) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        global.logger.error(`Error in config set command: ${error.message}`);
        return api.sendMessage(
          `❌ Error updating configuration: ${error.message}`,
          threadID,
          messageID
        );
      }
    }
    
    // If action is not recognized
    return api.sendMessage(
      `❌ Invalid action "${action}". Use "view" or "set".`,
      threadID,
      messageID
    );
  }
};