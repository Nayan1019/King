/**
 * Command: shell
 * Description: Allows admins to execute shell commands
 * Usage: {prefix}shell [command]
 * Permissions: ADMIN
 */

const { exec } = require('child_process');
const util = require('util');

module.exports = {
  config: {
    name: 'shell',
    aliases: ['terminal', 'console'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'ADMIN',
    description: 'Executes shell commands and returns the output',
    usage: '{prefix}shell [command]',
    cooldown: 5,
    permission: 'ADMIN'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check if user has permission
    const hasPermission = await global.permissions.check(senderID, this.config.permission);
    if (!hasPermission) {
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can execute shell commands.',
        threadID,
        messageID
      );
    }
    
    // Check if command is provided
    if (args.length === 0) {
      return api.sendMessage(
        `❌ Missing command\nUsage: ${global.config.prefix}${this.config.usage.replace('{prefix}', '')}`,
        threadID,
        messageID
      );
    }
    
    // Get the command to execute
    const command = args.join(' ');
    
    // Set reaction to indicate processing
    api.setMessageReaction("⏳", messageID, () => {}, true);
    
    try {
      // Execute the command
      const execPromise = util.promisify(exec);
      const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
      
      // Prepare response
      let response = '';
      
      if (stdout) {
        response += `📤 Output:\n${stdout}`;
      }
      
      if (stderr) {
        response += `${response ? '\n\n' : ''}⚠️ Error:\n${stderr}`;
      }
      
      if (!response) {
        response = '✅ Command executed successfully with no output.';
      }
      
      // Limit response length to avoid message size limits
      const maxLength = 4000;
      if (response.length > maxLength) {
        response = response.substring(0, maxLength) + '\n\n... (output truncated due to length)';
      }
      
      // Set success reaction
      api.setMessageReaction("✅", messageID, () => {}, true);
      
      // Send the response
      return api.sendMessage(
        `🖥️ Shell Command: ${command}\n\n${response}`,
        threadID,
        messageID
      );
    } catch (error) {
      // Set error reaction
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      // Log the error
      global.logger.error(`Error in shell command: ${error.message}`);
      
      // Send error message
      return api.sendMessage(
        `❌ Error executing command: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};