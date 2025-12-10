/**
 * Session Status Command
 * Shows current session health and connection status
 */

module.exports = {
  config: {
    name: "sessionstatus",
    aliases: ["ss","health"],
    description: "Check bot session health and connection status",
    usages: `${global.config.prefix}sessionstatus [refresh]`,
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: true,
    permission: "ADMIN",
    cooldowns: 5,
    category: 'SYSTEM'
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check admin permission
    const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!hasPermission) {
      return api.sendMessage("❌ You don't have permission to use this command.", threadID, messageID);
    }
    
    // Set processing reaction
    api.setMessageReaction("⏳", messageID, () => {}, true);
    
    // Handle refresh action
    if (args[0] === 'refresh') {
      try {
        if (!global.sessionManager) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return api.sendMessage("❌ Session Manager is not enabled.", threadID, messageID);
        }
        
        api.sendMessage("🔄 Forcing session refresh...", threadID, messageID);
        await global.sessionManager.forceRefresh();
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage("✅ Session refresh completed successfully!", threadID, messageID);
        
      } catch (error) {
        global.logger.error('Error refreshing session:', error);
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Failed to refresh session. Check logs for details.", threadID, messageID);
      }
    }
    
    try {
      const currentTime = new Date();
      const botStartTime = global.startTime || new Date();
      const uptime = currentTime - botStartTime;
      
      // Format uptime
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
      
      let statusMessage = "";
      statusMessage += "╭─────────────────────────────╮\n";
      statusMessage += "│    🔍 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐒𝐓𝐀𝐓𝐔𝐒    │\n";
      statusMessage += "╰─────────────────────────────╯\n\n";
      
      // Basic status
      statusMessage += "🤖 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨\n";
      statusMessage += "┌─────────────────────────┐\n";
      statusMessage += `│ ID: ${(global.client.botID || 'Unknown').toString().substring(0, 17).padEnd(17)} │\n`;
      statusMessage += `│ Uptime: ${(days + 'd ' + hours + 'h ' + minutes + 'm').padEnd(13)} │\n`;
      statusMessage += `│ Time: ${currentTime.toLocaleTimeString().padEnd(15)} │\n`;
      statusMessage += "└─────────────────────────┘\n\n";
      
      // Session Manager Status
      if (global.sessionManager) {
        const sessionStatus = global.sessionManager.getSessionStatus();
        statusMessage += "📡 𝐒𝐞𝐬𝐬𝐢𝐨𝐧 𝐌𝐚𝐧𝐚𝐠𝐞𝐫\n";
        statusMessage += "┌─────────────────────────┐\n";
        statusMessage += `│ Status: ${(sessionStatus.isLoggedIn ? '✅ Active' : '❌ Inactive').padEnd(15)} │\n`;
        statusMessage += `│ Last Refresh: ${new Date(sessionStatus.lastRefreshTime).toLocaleTimeString().padEnd(10)} │\n`;
        statusMessage += `│ Reconnects: ${sessionStatus.reconnectAttempts.toString().padEnd(11)} │\n`;
        statusMessage += `│ Minutes Ago: ${Math.floor(sessionStatus.timeSinceLastRefresh / 1000 / 60).toString().padEnd(10)} │\n`;
        statusMessage += "└─────────────────────────┘\n\n";
      } else {
        statusMessage += "📡 𝐒𝐞𝐬𝐬𝐢𝐨𝐧 𝐌𝐚𝐧𝐚𝐠𝐞𝐫: ❌ Disabled\n\n";
      }
      
      // Connection Status
      statusMessage += "🌐 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐨𝐧 𝐒𝐭𝐚𝐭𝐮𝐬\n";
      statusMessage += "┌─────────────────────────┐\n";
      statusMessage += `│ API: ${(global.api ? '✅ Available' : '❌ Missing').padEnd(17)} │\n`;
      statusMessage += `│ Database: ${(global.Thread ? '✅ Connected' : '❌ Missing').padEnd(13)} │\n`;
      statusMessage += "└─────────────────────────┘\n";
      
      // Memory Usage
      const memUsage = process.memoryUsage();
      statusMessage += "\n💾 𝐌𝐞𝐦𝐨𝐫𝐲 𝐔𝐬𝐚𝐠𝐞\n";
      statusMessage += "┌─────────────────────────┐\n";
      statusMessage += `│ RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1).padEnd(18)} MB │\n`;
      statusMessage += `│ Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1).padEnd(12)} MB │\n`;
      statusMessage += `│ Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1).padEnd(11)} MB │\n`;
      statusMessage += "└─────────────────────────┘\n";
      
      // Commands and Events
      const commandCount = global.client.commands ? global.client.commands.size : 0;
      const eventCount = global.client.events ? global.client.events.size : 0;
      statusMessage += "\n📊 𝐌𝐨𝐝𝐮𝐥𝐞𝐬\n";
      statusMessage += "┌─────────────────────────┐\n";
      statusMessage += `│ Commands: ${commandCount.toString().padEnd(13)} │\n`;
      statusMessage += `│ Events: ${eventCount.toString().padEnd(15)} │\n`;
      statusMessage += "└─────────────────────────┘\n";
      
      // Config Status
      statusMessage += "\n⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐭𝐢𝐨𝐧\n";
      statusMessage += "┌─────────────────────────┐\n";
      statusMessage += `│ Session Mgmt: ${(global.config.sessionManagement?.enabled ? '✅ On' : '❌ Off').padEnd(10)} │\n`;
      statusMessage += `│ Auto Reconnect: ${(global.config.fcaOptions?.autoReconnect ? '✅ On' : '❌ Off').padEnd(8)} │\n`;
      statusMessage += `│ Spam Protection: ${(global.config.spamBan?.enabled ? '✅ On' : '❌ Off').padEnd(6)} │\n`;
      statusMessage += `│ Debug Mode: ${(global.config.debug ? '✅ On' : '❌ Off').padEnd(11)} │\n`;
      statusMessage += "└─────────────────────────┘\n";
      
      // Health Score
      let healthScore = 100;
      if (!global.api) healthScore -= 30;
      if (!global.Thread) healthScore -= 20;
      if (global.sessionManager && !global.sessionManager.getSessionStatus().isLoggedIn) healthScore -= 25;
      if (commandCount === 0) healthScore -= 15;
      if (eventCount === 0) healthScore -= 10;
      
      let healthEmoji = '🟢';
      if (healthScore < 80) healthEmoji = '🟡';
      if (healthScore < 60) healthEmoji = '🟠';
      if (healthScore < 40) healthEmoji = '🔴';
      
      statusMessage += `\n${healthEmoji} 𝐎𝐯𝐞𝐫𝐚𝐥𝐥 𝐇𝐞𝐚𝐥𝐭𝐡: ${healthScore}%\n`;
      
      // Add actions for admins
      statusMessage += "\n🔧 𝐐𝐮𝐢𝐜𝐤 𝐀𝐜𝐭𝐢𝐨𝐧𝐬\n";
      statusMessage += `• ${global.config.prefix}sessionstatus refresh\n`;
      statusMessage += `• ${global.config.prefix}restart\n`;
      statusMessage += `• ${global.config.prefix}ping\n\n`;
      statusMessage += "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      statusMessage += "💡 Bot session monitoring active";
      
      // Set success reaction and send message
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(statusMessage, threadID, messageID);
      
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      global.logger.error('Error in sessionstatus command:', error);
      return api.sendMessage("❌ An error occurred while checking session status.", threadID, messageID);
    }
  }
};
