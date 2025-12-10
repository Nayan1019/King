/**
 * Server Config Command
 * Configure the bot's web server settings
 */

module.exports = {
  config: {
    name: "server-config",
    aliases: ["serverconfig", "configserver", "webconfig"],
    description: "Configure the bot's web server settings including enabling/disabling, port, and uptime monitoring",
    usages: "{prefix}server-config [option] [value]",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "CONFIG",
    hasPrefix: true,
    permission: "OWNER",
    cooldowns: 5
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const threadID = message.threadID;
    const messageID = message.messageID;
    
    // Check if user has admin permission
    const isAdmin = global.config.adminIDs.includes(message.senderID);
    if (!isAdmin) {
      return api.sendMessage("❌ You need admin permission to use this command.", threadID, messageID);
    }
    
    // Initialize server config if not exists
    if (!global.config.server) {
      global.config.server = {
        enabled: true,
        port: 4000,
        autoUptimeMonitoring: true
      };
    }
    
    // Handle arguments
    if (args.length > 0) {
      const action = args[0].toLowerCase();
      
      switch (action) {
        case "enable":
          global.config.server.enabled = true;
          api.sendMessage("✅ Server has been enabled. Restart the bot for changes to take effect.", threadID, messageID);
          return;
          
        case "disable":
          global.config.server.enabled = false;
          api.sendMessage("✅ Server has been disabled. Restart the bot for changes to take effect.", threadID, messageID);
          return;
          
        case "port":
          if (args.length < 2 || isNaN(args[1])) {
            return api.sendMessage("❌ Please provide a valid port number.", threadID, messageID);
          }
          
          const port = parseInt(args[1]);
          if (port < 1 || port > 65535) {
            return api.sendMessage("❌ Port number must be between 1 and 65535.", threadID, messageID);
          }
          
          global.config.server.port = port;
          api.sendMessage(`✅ Server port has been set to ${port}. Restart the bot for changes to take effect.`, threadID, messageID);
          return;
          
        case "monitor":
        case "monitoring":
          if (args.length < 2) {
            return api.sendMessage("❌ Please specify 'on' or 'off' for uptime monitoring.", threadID, messageID);
          }
          
          const monitoringStatus = args[1].toLowerCase();
          if (monitoringStatus === "on") {
            global.config.server.autoUptimeMonitoring = true;
            api.sendMessage("✅ Uptime monitoring has been enabled. Restart the bot for changes to take effect.", threadID, messageID);
          } else if (monitoringStatus === "off") {
            global.config.server.autoUptimeMonitoring = false;
            api.sendMessage("✅ Uptime monitoring has been disabled. Restart the bot for changes to take effect.", threadID, messageID);
          } else {
            api.sendMessage("❌ Invalid option. Please use 'on' or 'off'.", threadID, messageID);
          }
          return;
          
        default:
          api.sendMessage("❌ Invalid action. Available actions: enable, disable, port, monitor.", threadID, messageID);
          return;
      }
    }
    
    // Display current configuration
    const serverEnabled = global.config.server.enabled !== false ? "Enabled" : "Disabled";
    const serverPort = global.config.server.port || 4000;
    const monitoringEnabled = global.config.server.autoUptimeMonitoring !== false ? "Enabled" : "Disabled";
    
    const configMessage = `⚙️ **Server Configuration**\n\n` +
                   `📊 **Current Settings**\n` +
                   `- Server: ${serverEnabled}\n` +
                   `- Port: ${serverPort}\n` +
                   `- Uptime Monitoring: ${monitoringEnabled}\n\n` +
                   `📝 **Available Commands**\n` +
                   `- /server-config enable - Enable the server\n` +
                   `- /server-config disable - Disable the server\n` +
                   `- /server-config port <number> - Set server port\n` +
                   `- /server-config monitor <on|off> - Toggle uptime monitoring\n\n` +
                   `⚠️ Note: Changes require a bot restart to take effect.`;
    
    return api.sendMessage(configMessage, threadID, messageID);
  }
};