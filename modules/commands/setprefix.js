/**
 * Command: setprefix
 * Description: Changes the bot's command prefix
 * Usage: {prefix}setprefix [new_prefix]
 * Permissions: ADMIN
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'setprefix',
    aliases: ['changeprefix'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'ADMIN',
    description: 'Changes the bot\'s command prefix',
    usage: '{prefix}setprefix [new_prefix]',
    cooldown: 5,
    permission: 'ADMIN'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check if user has permission
    const hasPermission = await global.permissions.check(senderID, this.config.permission);
    if (!hasPermission) {
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can change the prefix.',
        threadID,
        messageID
      );
    }
    
    // Check if new prefix is provided
    if (!args[0]) {
      return api.sendMessage(
        `❌ Missing new prefix\nUsage: ${global.config.prefix}${this.config.usage.replace('{prefix}', '')}\nCurrent prefix: ${global.config.prefix}`,
        threadID,
        messageID
      );
    }
    
    const newPrefix = args[0];
    
    // Validate prefix (not too long)
    if (newPrefix.length > 5) {
      return api.sendMessage(
        '❌ Prefix is too long. Please use a prefix with 5 or fewer characters.',
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
      
      // Check if prefix is the same
      if (config.prefix === newPrefix) {
        api.setMessageReaction("ℹ️", messageID, () => {}, true);
        return api.sendMessage(
          `ℹ️ The prefix is already set to "${newPrefix}".`,
          threadID,
          messageID
        );
      }
      
      // Store old prefix for message
      const oldPrefix = config.prefix;
      
      // Update prefix
      config.prefix = newPrefix;
      
      // Save updated config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Update global config
      global.config = config;
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        `✅ Successfully changed prefix from "${oldPrefix}" to "${newPrefix}"\n\nExample usage: ${newPrefix}help`,
        threadID,
        messageID
      );
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error(`Error in setprefix command: ${error.message}`);
      return api.sendMessage(
        `❌ Error changing prefix: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};