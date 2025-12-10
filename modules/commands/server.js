/**
 * Server Command
 * Shows server status and preview URL
 */

module.exports = {
  config: {
    name: "server",
    aliases: ["status"],
    description: "Displays server status and preview URL if available",
    usages: "{prefix}server",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "SERVER",
    hasPrefix: true,
    permission: "PUBLIC",
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
    
    // Get server information
    const serverInfo = [];
    
    // Add uptime
    if (global.server && global.server.formatUptime) {
      serverInfo.push(`⏱️ Uptime: ${global.server.formatUptime()}`);
    }
    
    // Count unique commands (exclude aliases)
    const uniqueCommands = new Set();
    for (const [key, cmd] of global.client.commands.entries()) {
      if (key === cmd.config.name) {
        uniqueCommands.add(key);
      }
    }
    
    // Add command and event counts
    serverInfo.push(`📝 Commands: ${uniqueCommands.size}`);
    serverInfo.push(`🔔 Events: ${global.client.events.size}`);
    
    // Add server URL if available
    if (global.config.serverUrl) {
      serverInfo.push(`🌐 Preview URL: ${global.config.serverUrl}`);
    }
    
    // Add Render URL if available
    if (global.config.renderUrl) {
      serverInfo.push(`🚀 Render URL: ${global.config.renderUrl}`);
      
      // Check if uptime monitoring is enabled
      const uptimeStatus = (global.config.server && global.config.server.autoUptimeMonitoring === false) 
        ? "Disabled" 
        : "Active (auto-ping every 5 minutes)";
      
      serverInfo.push(`✅ Uptime monitoring: ${uptimeStatus}`);
    }
    
    // Create message
    const serverStatusMessage = `📊 Server Status\n\n${serverInfo.join('\n')}\n\nℹ️ Use the preview URL to view the bot's web interface.\n\n💡 Bot will stay online on Render.com even when inactive - the automatic ping system prevents the server from sleeping.`;
    
    // Send message
    return api.sendMessage(serverStatusMessage, threadID, messageID);
  }
};