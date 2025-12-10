/**
 * TID Command
 * Gets the thread ID of the current group chat
 */

module.exports = {
  config: {
    name: 'tid',
    aliases: ['threadid', 'gettid'],
    description: 'Get the thread ID of the current group chat',
    usage: '{prefix}tid',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'GROUP',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 3
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
      // Get thread info to check if it's a group
      const threadInfo = await api.getThreadInfo(threadID);
      
      // Create response message
      let responseMsg = '';
      
      if (threadInfo.isGroup) {
        responseMsg = `📋 Group Name: ${threadInfo.threadName || 'Unknown Group'}\n🆔 Thread ID: ${threadID}`;
      } else {
        responseMsg = `💬 This is a direct message conversation\n🆔 Thread ID: ${threadID}`;
      }
      
      return api.sendMessage(responseMsg, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in tid command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};