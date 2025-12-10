/**
 * GroupInfo Command
 * Shows detailed information about the current group
 */

module.exports = {
  config: {
    name: 'groupinfo',
    aliases: ['threadinfo'],
    description: 'Shows detailed information about the current group',
    usage: '{prefix}groupinfo',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'GROUP',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5
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
    
    try {
      // Get thread info
      const threadInfo = await api.getThreadInfo(threadID);
      
      // Check if this is a group chat
      if (!threadInfo.isGroup) {
        return api.sendMessage('❌ This command can only be used in group chats.', threadID, messageID);
      }
      
      // Format creation timestamp
      let createdDate = 'Unknown';
      let createdTime = 'Unknown';
      if (threadInfo.threadCreateTime) {
        const createdAt = new Date(Number(threadInfo.threadCreateTime));
        if (!isNaN(createdAt.getTime())) {
          createdDate = createdAt.toLocaleDateString();
          createdTime = createdAt.toLocaleTimeString();
        }
      }
      
      // Get admin list
      const adminList = threadInfo.adminIDs || [];
      let adminNames = [];
      
      // Get user info for admins
      if (adminList.length > 0) {
        for (const admin of adminList) {
          try {
            const userInfo = await api.getUserInfo([admin.id]);
            if (userInfo && userInfo[admin.id]) {
              adminNames.push(userInfo[admin.id].name);
            } else {
              adminNames.push(`Unknown (ID: ${admin.id})`);
            }
          } catch (userError) {
            global.logger.warn(`Could not fetch info for admin ${admin.id}: ${userError.message}`);
            adminNames.push(`Unknown (ID: ${admin.id})`);
          }
        }
      }
      
      // Create message
      let infoMessage = "📋 GROUP INFORMATION\n\n";
      
      // Basic info
      infoMessage += `📝 Name: ${threadInfo.threadName || 'Unknown Group'}\n`;
      infoMessage += `🆔 Thread ID: ${threadID}\n`;
      infoMessage += `👥 Member Count: ${threadInfo.participantIDs.length}\n`;
      infoMessage += `👑 Admin Count: ${adminList.length}\n`;

      
      // Approval mode
      infoMessage += `🔐 Approval Mode: ${threadInfo.approvalMode ? 'ON' : 'OFF'}\n`;
      
      // Group image
      if (threadInfo.imageSrc) {
        infoMessage += `🖼️ Group Image: Available\n`;
      } else {
        infoMessage += `🖼️ Group Image: Not set\n`;
      }
      
      // Emoji
      if (threadInfo.emoji) {
        infoMessage += `😀 Group Emoji: ${threadInfo.emoji}\n`;
      }
      
      // Theme
      if (threadInfo.theme) {
        infoMessage += `🎨 Theme: ${threadInfo.theme}\n`;
      }
      
      // Admin list
      infoMessage += `
👑 Admins:
`;
      if (adminNames.length > 0) {
        adminNames.forEach((name, index) => {
          infoMessage += `${index + 1}. ${name}\n`;
        });
      } else {
        infoMessage += `No admins found\n`;
      }
      
      // Send message with group image if available
      if (threadInfo.imageSrc) {
        return api.sendMessage(
          {
            body: infoMessage,
            attachment: await global.utils.getImageFromURL(threadInfo.imageSrc)
          },
          threadID, messageID
        );
      } else {
        return api.sendMessage(infoMessage, threadID, messageID);
      }
      
    } catch (error) {
      global.logger.error('Error in groupinfo command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};