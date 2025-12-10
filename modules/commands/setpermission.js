/**
 * Command: setpermission
 * Description: Allows admins to change permission level of any command
 * Usage: {prefix}setpermission [command_name] [permission_level]
 * Permissions: ADMIN
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'setpermission',
    aliases: ['changepermission', 'cmdperm'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'ADMIN',
    description: 'Changes the permission level of a command',
    usage: '{prefix}setpermission [command_name] [permission_level]',
    cooldown: 5,
    permission: 'ADMIN'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check if user has permission
    const hasPermission = await global.permissions.check(senderID, this.config.permission);
    if (!hasPermission) {
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can change command permissions.',
        threadID,
        messageID
      );
    }
    
    // Check if command name and permission level are provided
    if (args.length < 2) {
      return api.sendMessage(
        `❌ Missing parameters\nUsage: ${global.config.prefix}${this.config.usage.replace('{prefix}', '')}\n\nAvailable permission levels: PUBLIC, SUPPORTER, ADMIN, OWNER`,
        threadID,
        messageID
      );
    }
    
    const commandName = args[0].toLowerCase();
    const newPermission = args[1].toUpperCase();
    
    // Validate permission level
    const validPermissions = ['PUBLIC', 'SUPPORTER', 'ADMIN', 'OWNER'];
    if (!validPermissions.includes(newPermission)) {
      return api.sendMessage(
        `❌ Invalid permission level: ${newPermission}\nValid permission levels: ${validPermissions.join(', ')}`,
        threadID,
        messageID
      );
    }
    
    try {
      // Set reaction to indicate processing
      api.setMessageReaction("⏳", messageID, () => {}, true);
      
      // Find the command
      const command = global.client.commands.get(commandName) || 
                     [...global.client.commands.values()].find(cmd => 
                       cmd.config.aliases && cmd.config.aliases.includes(commandName)
                     );
      
      if (!command) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          `❌ Command "${commandName}" not found.`,
          threadID,
          messageID
        );
      }
      
      // Get the command file path
      const commandFilePath = path.join(__dirname, `${command.config.name}.js`);
      
      if (!fs.existsSync(commandFilePath)) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          `❌ Command file for "${command.config.name}" not found.`,
          threadID,
          messageID
        );
      }
      
      // Read the command file
      let commandFileContent = fs.readFileSync(commandFilePath, 'utf8');
      
      // Store old permission for message
      const oldPermission = command.config.permission || 'PUBLIC';
      
      // Check if permission is the same
      if (oldPermission === newPermission) {
        api.setMessageReaction("ℹ️", messageID, () => {}, true);
        return api.sendMessage(
          `ℹ️ The permission for command "${command.config.name}" is already set to "${newPermission}".`,
          threadID,
          messageID
        );
      }
      
      // Update permission in the file
      if (commandFileContent.includes(`permission: '${oldPermission}'`)) {
        commandFileContent = commandFileContent.replace(
          `permission: '${oldPermission}'`, 
          `permission: '${newPermission}'`
        );
      } else if (commandFileContent.includes(`permission: "${oldPermission}"`)) {
        commandFileContent = commandFileContent.replace(
          `permission: "${oldPermission}"`, 
          `permission: "${newPermission}"`
        );
      } else {
        // If permission field not found, try to add it
        const configRegex = /config:\s*{([^}]*)}/s;
        const configMatch = commandFileContent.match(configRegex);
        
        if (configMatch) {
          const configContent = configMatch[1];
          const updatedConfigContent = configContent.trim().endsWith(',')
            ? `${configContent}\n    permission: '${newPermission}'`
            : `${configContent},\n    permission: '${newPermission}'`;
          
          commandFileContent = commandFileContent.replace(
            configRegex,
            `config: {${updatedConfigContent}}`
          );
        } else {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return api.sendMessage(
            `❌ Could not update permission for command "${command.config.name}". Config section not found.`,
            threadID,
            messageID
          );
        }
      }
      
      // Save updated command file
      fs.writeFileSync(commandFilePath, commandFileContent, 'utf8');
      
      // Update command in memory
      command.config.permission = newPermission;
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        `✅ Successfully changed permission for command "${command.config.name}" from "${oldPermission}" to "${newPermission}".`,
        threadID,
        messageID
      );
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error(`Error in setpermission command: ${error.message}`);
      return api.sendMessage(
        `❌ Error changing permission: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};