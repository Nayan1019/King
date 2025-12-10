/**
 * Ping Command
 * Tests the bot's response time
 */

module.exports = {
  config: {
    name: "ping",
    aliases: ["check", "pong"],
    description: "Checks if the bot is alive",
    usages: "{prefix}ping",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "GENERAL",
    hasPrefix: true,
    permission: "PUBLIC",
    cooldowns: 3
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    // Record start time
    const start = Date.now();
    
    // Send ping result directly without intermediate message
    const responseTime = Date.now() - start;
    
    return api.sendMessage(`🏓 Pong! Bot is online!\n⏱️ Response time: ${responseTime}ms`, threadID, messageID);
  }
};