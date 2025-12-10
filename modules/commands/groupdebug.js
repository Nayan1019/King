/**
 * Group Debug Command
 * Helps debug group permission issues
 */

module.exports = {
  config: {
    name: "groupdebug",
    aliases: ["gdebug", "groupcheck"],
    description: "Debug group permission issues",
    usage: "/groupdebug [threadID]",
    cooldown: 5,
    permission: "ADMIN",
    category: "Admin",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭"
  },

  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Check if user has admin permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
      if (!hasPermission) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      let targetThreadID = threadID;
      
      // If thread ID is provided, use that instead
      if (args.length > 0 && args[0].length > 10) {
        targetThreadID = args[0];
      }
      
      // Set reaction to indicate processing
      api.setMessageReaction("⏳", messageID, () => {}, true);
      
      let debugInfo = `🔍 **Group Debug Information**\n\n`;
      debugInfo += `📋 **Thread ID:** ${targetThreadID}\n`;
      
      try {
        // Get thread info
        const threadInfo = await api.getThreadInfo(targetThreadID);
        debugInfo += `📝 **Thread Name:** ${threadInfo.threadName || 'Unknown'}\n`;
        debugInfo += `👥 **Is Group:** ${threadInfo.isGroup ? 'Yes' : 'No'}\n`;
        debugInfo += `👤 **Participants:** ${threadInfo.participantIDs ? threadInfo.participantIDs.length : 'Unknown'}\n`;
        debugInfo += `🔒 **Can Reply:** ${threadInfo.canReply ? 'Yes' : 'No'}\n`;
        
        if (threadInfo.cannotReplyReason) {
          debugInfo += `❌ **Cannot Reply Reason:** ${threadInfo.cannotReplyReason}\n`;
        }
        
        if (threadInfo.adminIDs && threadInfo.adminIDs.length > 0) {
          debugInfo += `👑 **Admins:** ${threadInfo.adminIDs.length}\n`;
        }
        
        debugInfo += `\n📊 **Bot Status:**\n`;
        debugInfo += `🆔 **Bot ID:** ${global.client.botID}\n`;
        debugInfo += `✅ **Bot in Group:** ${threadInfo.participantIDs ? threadInfo.participantIDs.includes(global.client.botID) : 'Unknown'}\n`;
        
        // Test message sending capability
        debugInfo += `\n🧪 **Testing Message Sending:**\n`;
        
        try {
          // Try to send a test message
          await api.sendMessage('🔧 Test message for group debug', targetThreadID);
          debugInfo += `✅ **Send Test:** Success\n`;
        } catch (sendError) {
          debugInfo += `❌ **Send Test:** Failed\n`;
          debugInfo += `📝 **Error:** ${sendError.message || sendError}\n`;
          
          if (sendError.errorCode === 1545012) {
            debugInfo += `\n🚨 **Issue:** Bot may not have permission to send messages in this group\n`;
            debugInfo += `💡 **Solution:** Check if bot is admin or has proper permissions\n`;
          }
        }
        
        // Check database status
        debugInfo += `\n🗄️ **Database Status:**\n`;
        try {
          const thread = await global.Thread.findOne({ threadID: targetThreadID });
          if (thread) {
            debugInfo += `✅ **Thread in DB:** Yes\n`;
            debugInfo += `🚫 **Thread Banned:** ${thread.isBanned ? 'Yes' : 'No'}\n`;
            if (thread.isBanned) {
              debugInfo += `📝 **Ban Reason:** ${thread.banReason || 'No reason provided'}\n`;
            }
          } else {
            debugInfo += `❌ **Thread in DB:** No (will be created automatically)\n`;
          }
        } catch (dbError) {
          debugInfo += `❌ **Database Error:** ${dbError.message}\n`;
        }
        
      } catch (threadError) {
        debugInfo += `❌ **Thread Info Error:** ${threadError.message}\n`;
        debugInfo += `💡 **Possible Issues:**\n`;
        debugInfo += `   • Thread ID is invalid\n`;
        debugInfo += `   • Bot is not in the group\n`;
        debugInfo += `   • Group has been deleted\n`;
        debugInfo += `   • Permission issues\n`;
      }
      
      // Add troubleshooting tips
      debugInfo += `\n🔧 **Troubleshooting Tips:**\n`;
      debugInfo += `   • Make sure bot is added to the group\n`;
      debugInfo += `   • Check if bot has admin permissions\n`;
      debugInfo += `   • Verify group is not banned in database\n`;
      debugInfo += `   • Try restarting the bot\n`;
      debugInfo += `   • Check Facebook account status\n`;
      
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(debugInfo, threadID, messageID);
      
    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ Error in group debug: ${error.message}`, threadID, messageID);
    }
  }
};
