/**
 * Logs Command
 * Manages logging of messages in console with color formatting
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const config = global.configPath || path.join(__dirname, '..', '..', 'config.json');

function saveConfig() {
  try {
    if (typeof global.saveConfig === 'function') {
      global.saveConfig();
    } else {
      fs.writeFileSync(config, JSON.stringify(global.config, null, 2));
    }
  } catch (error) {
    console.error('Failed to save config for logs command:', error);
  }
}

// Enable logs based on saved config (default true)
const hasSavedValue = typeof global.config.logsEnabled === 'boolean';
let logsEnabled = hasSavedValue ? global.config.logsEnabled : true;
global.config.logsEnabled = logsEnabled;
if (!hasSavedValue) {
  saveConfig();
}

// Function to generate random hex colors
function getRandomColor() {
  return Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

module.exports = {
  config: {
    name: "logs",
    description: "Manage and display colorful logs",
    usages: "{prefix}logs <on/off>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "ADMIN",
    hasPrefix: true,
    permission: "ADMIN",
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
    const { threadID, messageID } = message;

    // Check if arguments are provided
    if (!args || args.length === 0) {
      const statusMsg = await api.sendMessage(`🔄 Checking logs status...`, threadID);
      
      const status = logsEnabled ? "✅ ENABLED" : "❌ DISABLED";
      const helpText = `📊 **LOGS STATUS: ${status}**\n\n` +
        `📝 Usage:\n` +
        `• ${global.config.prefix}logs on - Enable colorful logs\n` +
        `• ${global.config.prefix}logs off - Disable logs\n\n` +
        `🎨 Log Format:\n` +
        `• Group name & ID with random colors\n` +
        `• User name & ID with random colors\n` +
        `• Message content with random colors\n` +
        `• Timestamp with random colors\n` +
        `• Beautiful separator with PRIYANSH BOT🐧`;
      
      return api.editMessage(helpText, statusMsg.messageID);
    }

    const action = args[0].toLowerCase();
    const statusMsg = await api.sendMessage(`🔄 ${action === 'on' ? 'Enabling' : 'Disabling'} logs...`, threadID);

    if (action === 'on') {
      logsEnabled = true;
      global.config.logsEnabled = true;
      saveConfig();
      api.editMessage("✅ Colorful logging is now **ENABLED**! 🎨\n\nAll messages will be logged to console with random colors.", statusMsg.messageID);
    } else if (action === 'off') {
      logsEnabled = false;
      global.config.logsEnabled = false;
      saveConfig();
      api.editMessage("🛑 Logging is now **DISABLED**! 📵\n\nNo messages will be logged to console.", statusMsg.messageID);
    } else {
      return api.editMessage(
        `❌ Invalid argument: "${action}"\n\nUse 'on' or 'off'\n\nExample: ${global.config.prefix}logs on`,
        statusMsg.messageID
      );
    }
  }
};

/**
 * Log a message to the console with colorful format
 * @param {Object} details - Contains thread name, user, and message
 */
function logMessage(details) {
  if (!logsEnabled) {
    return;
  }

  const { threadName, threadID, userName, userID, userMessage, time } = details;
  
  // Generate random colors for each element
  const random = getRandomColor();
  const random1 = getRandomColor();
  const random2 = getRandomColor();
  const random3 = getRandomColor();
  const random4 = getRandomColor();
  const random5 = getRandomColor();
  const random6 = getRandomColor();
  
  // Create colorful log with the specified format
  console.log(
    chalk.hex("#" + random)(`[💓]→ Group name: ${threadName}`) + `\n` + 
    chalk.hex("#" + random5)(`[🔎]→ Group ID: ${threadID}`) + `\n` + 
    chalk.hex("#" + random6)(`[🔱]→ User name: ${userName}`) + `\n` + 
    chalk.hex("#" + random1)(`[📝]→ User ID: ${userID}`) + `\n` + 
    chalk.hex("#" + random2)(`[📩]→ Content: ${userMessage}`) + `\n` + 
    chalk.hex("#" + random3)(`[ ${time} ]`) + `\n` + 
    chalk.hex("#" + random4)(`◆━━━━━━━━━◆PRIYANSH BOT🐧◆━━━━━━━━◆\n`)
  );
}

// Export both the command and logging functions
module.exports.logMessage = logMessage;
module.exports.logsEnabled = () => logsEnabled;
