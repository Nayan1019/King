/**
 * Hosting Command
 * Shows information about the bot's hosting options
 */

module.exports = {
  config: {
    name: "hosting",
    aliases: ["host", "hostinfo", "deployment"],
    description: "Displays information about the bot's hosting options and current status",
    usages: "{prefix}hosting",
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
    
    // Check if running on Render
    const isOnRender = !!process.env.RENDER_EXTERNAL_URL;
    
    // Create message
    let hostingMessage = "🌐 **Bot Hosting Information**\n\n";
    
    // Current hosting status
    hostingMessage += "📊 **Current Status**\n";
    if (isOnRender) {
      hostingMessage += `✅ Bot is running on Render.com\n`;
      hostingMessage += `🔗 URL: ${process.env.RENDER_EXTERNAL_URL}\n`;
      
      // Get uptime monitoring status
      const uptimeStatus = (global.config.server && global.config.server.autoUptimeMonitoring === false) 
        ? "Disabled" 
        : "Active (auto-ping every 5 minutes)";
      
      hostingMessage += `⏱️ Uptime monitoring: ${uptimeStatus}\n\n`;
    } else {
      hostingMessage += `💻 Bot is running locally\n`;
      if (global.config.serverUrl) {
        hostingMessage += `🔗 Local URL: ${global.config.serverUrl}\n\n`;
      } else {
        hostingMessage += `\n`;
      }
    }
    
    // Deployment options
    hostingMessage += "🚀 **Deployment Options**\n";
    hostingMessage += "1. **Render.com (Recommended)**\n";
    hostingMessage += "   - Free tier available\n";
    hostingMessage += "   - Automatic deployment from GitHub\n";
    hostingMessage += "   - Built-in uptime monitoring\n";
    hostingMessage += "   - Web preview interface\n\n";
    
    hostingMessage += "2. **Replit**\n";
    hostingMessage += "   - Free tier available\n";
    hostingMessage += "   - Requires external uptime monitoring\n";
    hostingMessage += "   - May have performance limitations\n\n";
    
    hostingMessage += "3. **Heroku**\n";
    hostingMessage += "   - Requires credit card for free tier\n";
    hostingMessage += "   - 550 free dyno hours per month\n";
    hostingMessage += "   - Sleeps after 30 minutes of inactivity\n\n";
    
    hostingMessage += "4. **VPS/Dedicated Server**\n";
    hostingMessage += "   - Full control over environment\n";
    hostingMessage += "   - Requires server management knowledge\n";
    hostingMessage += "   - Monthly cost varies\n\n";
    
    // Render.com deployment instructions
    hostingMessage += "💡 **How to Deploy on Render.com**\n";
    hostingMessage += "1. Create a Render.com account\n";
    hostingMessage += "2. Connect your GitHub repository\n";
    hostingMessage += "3. Create a new Web Service\n";
    hostingMessage += "4. Use the render.yaml configuration file\n";
    hostingMessage += "5. Deploy and enjoy 24/7 uptime\n\n";
    
    hostingMessage += "📝 For more information, use the /renderinfo command.";
    
    // Send message
    return api.sendMessage(hostingMessage, threadID, messageID);
  }
};