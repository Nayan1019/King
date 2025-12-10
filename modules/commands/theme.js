/**
 * Theme Command
 * Changes group chat theme using MQTT-based API
 * Features: List themes, search by name, set by ID
 */

module.exports = {
  config: {
    name: 'theme',
    aliases: ['settheme', 'changetheme'],
    description: 'Changes the group chat theme or lists available themes',
    usage: '{prefix}theme <theme_name/list>',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
    category: 'GROUP'
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
    
    // Check if this is a group chat
    try {
      const threadInfo = await new Promise((resolve, reject) => {
        api.getThreadInfo(threadID, (err, info) => {
          if (err) return reject(err);
          resolve(info);
        });
      });
      
      if (!threadInfo.isGroup) {
        return api.sendMessage('❌ This command can only be used in group chats.', threadID, messageID);
      }
    } catch (error) {
      global.logger.error('Error checking thread type:', error);
      return api.sendMessage('❌ Error checking group information.', threadID, messageID);
    }
    
    // Check if argument is provided
    if (args.length === 0) {
      return api.sendMessage(
        '🎨 **Theme Command Usage**\n\n' +
        '📋 List themes: {prefix}theme list\n' +
        '🎨 Set theme: {prefix}theme <name>\n\n' +
        '**Examples:**\n' +
        '• {prefix}theme list\n' +
        '• {prefix}theme love\n' +
        '• {prefix}theme dark\n' +
        '• {prefix}theme ocean',
        threadID, messageID
      );
    }
    
    const themeName = args.join(' ');
    
    // If user wants to list themes
    if (themeName.toLowerCase() === 'list') {
      try {
        api.sendMessage('⏳ Fetching available themes from Facebook...', threadID, messageID);
        
        const themes = await new Promise((resolve, reject) => {
          api.changeThreadTheme('list', threadID, (err, data) => {
            if (err) return reject(err);
            resolve(data);
          });
        });
        
        if (!themes || themes.length === 0) {
          return api.sendMessage('❌ No themes found.', threadID);
        }
        
        // Format themes list
        let themesList = '🎨 **Available Themes** 🎨\n\n';
        
        // Group themes for better display (show first 30)
        const displayThemes = themes.slice(0, 30);
        
        displayThemes.forEach((theme, index) => {
          themesList += `${index + 1}. ${theme.name}\n`;
          if (theme.description) {
            themesList += `   ℹ️ ${theme.description}\n`;
          }
        });
        
        if (themes.length > 30) {
          themesList += `\n... and ${themes.length - 30} more themes!\n`;
        }
        
        themesList += '\n💡 **Usage:** {prefix}theme <name>';
        themesList += '\n📝 **Example:** {prefix}theme love';
        
        return api.sendMessage(themesList, threadID);
        
      } catch (error) {
        global.logger.error('Error fetching themes:', error);
        return api.sendMessage(
          '❌ Failed to fetch themes. Error: ' + (error.error || error.message || 'Unknown error'),
          threadID
        );
      }
    }
    
    // Otherwise, set the theme
    try {
      api.sendMessage(`⏳ Searching for theme "${themeName}" and applying...`, threadID, messageID);
      
      const result = await new Promise((resolve, reject) => {
        api.changeThreadTheme(themeName, threadID, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
      
      // Success message
      return api.sendMessage(
        `✅ **Theme Changed Successfully!** 🎨\n\n` +
        `📝 Theme: ${result.themeName}\n` +
        `🆔 Theme ID: ${result.themeID}\n` +
        `👤 Changed by: You\n` +
        `⏰ Time: ${new Date(result.timestamp).toLocaleString()}`,
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error changing theme:', error);
      
      let errorMessage = '❌ Failed to change theme.\n\n';
      
      if (error.error) {
        if (error.error.includes('not found')) {
          errorMessage += `🔍 Theme "${themeName}" not found.\n\n`;
          errorMessage += '💡 Try:\n';
          errorMessage += '• {prefix}theme list - to see all themes\n';
          errorMessage += '• Check spelling of the theme name\n';
          errorMessage += '• Use partial names (e.g., "dark" for "Dark Mode")';
        } else if (error.error.includes('MQTT')) {
          errorMessage += '📡 MQTT connection issue.\n\n';
          errorMessage += 'The bot is still connecting. Please wait a few seconds and try again.';
        } else {
          errorMessage += 'Error: ' + error.error;
        }
      } else {
        errorMessage += 'Error: ' + (error.message || 'Unknown error');
      }
      
      return api.sendMessage(errorMessage, threadID);
    }
  }
};
