/**
 * Uptime Command
 * Shows how long the bot has been running
 */

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up"],
    description: "Shows how long the bot has been running",
    usages: "{prefix}uptime",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "GENERAL",
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
  run: async function ({ api, message, args }) {
    const { threadID, messageID } = message;

    // Use server module's formatUptime if available, otherwise calculate manually
    let uptimeStr;
    if (global.server && global.server.formatUptime) {
      uptimeStr = global.server.formatUptime();
    } else {
      // Calculate uptime
      const uptimeMs = process.uptime() * 1000;

      // Format uptime
      const seconds = Math.floor((uptimeMs / 1000) % 60);
      const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
      const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

      // Create uptime string
      uptimeStr = '';
      if (days > 0) uptimeStr += `${days} day${days > 1 ? 's' : ''}, `;
      if (hours > 0) uptimeStr += `${hours} hour${hours > 1 ? 's' : ''}, `;
      if (minutes > 0) uptimeStr += `${minutes} minute${minutes > 1 ? 's' : ''}, `;
      uptimeStr += `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100;

    // Get bot info
    const botID = api.getCurrentUserID();
    const isRestarted = typeof global.isRestart !== 'undefined' && global.isRestart;

    // Get server info
    let serverInfo = '';
    if (global.config.serverUrl) {
      serverInfo = `\n🌐 Preview URL: ${global.config.serverUrl}`;
    }

    // Add Render URL if available
    if (global.config.renderUrl) {
      serverInfo += `\n🚀 Render URL: ${global.config.renderUrl}`;
    }

    // Count unique commands (exclude aliases)
    const uniqueCommands = new Set();
    for (const [key, cmd] of global.client.commands.entries()) {
      if (key === cmd.config.name) {
        uniqueCommands.add(key);
      }
    }

    // Count threads and users from database
    const totalThreads = await global.Thread.countDocuments();
    const totalUsers = await global.User.countDocuments();

    // Get bot and owner data for names
    const ownerID = global.config.ownerID;
    let botData = await global.User.findOne({ userID: botID });
    let ownerData = await global.User.findOne({ userID: ownerID });
    const botName = botData?.name || 'Bot';
    const ownerName = ownerData?.name || 'Owner';

    // Create status message with mentions
    const statusMessage = `🤖 Bot Status 🤖\n\n` +
      `🆔 Bot: ${botName}\n` +
      `⏱️ Uptime: ${uptimeStr}\n` +
      `🧠 Memory: ${memoryUsedMB} MB\n` +
      `🔄 Restarted: ${isRestarted ? 'Yes' : 'No'}\n` +
      `📊 Commands: ${uniqueCommands.size}\n` +
      `📋 Events: ${global.client.events.size}\n` +
      `👥 Total Users: ${totalUsers}\n` +
      `💬 Total Threads: ${totalThreads}\n` +
      `👑 Owner: ${ownerName}` +
      `${serverInfo}\n` +
      `\n🟢 Bot is online and operational!`;

    // Create mentions array
    const mentions = [
      {
        tag: botName,
        id: botID
      },
      {
        tag: ownerName,
        id: ownerID
      }
    ];

    // Send status message with mentions
    return api.sendMessage({
      body: statusMessage,
      mentions: mentions
    }, threadID, messageID);
  }
};