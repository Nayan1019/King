/**
 * Preview Command
 * Shows the bot's web interface preview URL
 */

module.exports = {
  config: {
    name: "preview",
    aliases: ["webpreview", "url", "link"],
    description: "Displays the URL to access the bot's web interface preview",
    usages: "{prefix}preview",
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
  run: async function({ api, message, args }) {
    const threadID = message.threadID;
    const messageID = message.messageID;
    
    // Check if server is enabled
    if (!global.config.server || global.config.server.enabled === false) {
      return api.sendMessage("❌ The web preview is currently disabled in the bot configuration.", threadID, messageID);
    }
    
    // Get URLs
    const localUrl = global.config.serverUrl || `http://localhost:${global.config.server.port || 3000}`;
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    
    // Create message
    let previewMessage = "🌐 **Bot Web Preview**\n\n";
    
    if (renderUrl) {
      previewMessage += `✅ The bot is running on Render.com\n\n`;
      previewMessage += `📊 **Preview URLs**\n`;
      previewMessage += `- Local URL: ${localUrl}\n`;
      previewMessage += `- Render URL: ${renderUrl} (accessible from anywhere)\n\n`;
      previewMessage += `💡 The Render URL is publicly accessible and shows real-time bot statistics.\n`;
      previewMessage += `⏱️ Uptime monitoring is active to keep the bot online 24/7.\n`;
    } else {
      previewMessage += `💻 The bot is running locally\n\n`;
      previewMessage += `📊 **Preview URL**\n`;
      previewMessage += `- Local URL: ${localUrl} (only accessible from your network)\n\n`;
      previewMessage += `💡 To make the preview accessible from anywhere, deploy the bot to Render.com.\n`;
      previewMessage += `📝 Use the /render-deploy command for deployment instructions.\n`;
    }
    
    // Add QR code suggestion
    previewMessage += `\n💡 **Tip**: You can scan this QR code to open the preview URL on your mobile device:`;
    
    // Send message
    return api.sendMessage(previewMessage, threadID, messageID);
  }
};