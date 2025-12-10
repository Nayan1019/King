/**
 * Top Command
 * Shows top users by level, experience, money, or message count
 */

module.exports = {
  config: {
    name: 'top',
    aliases: ['topusers', 'toplist'],
    description: 'Shows the top users by level, experience, money, or message count',
    usage: '{prefix}top [level/exp/money/messages] [count]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10
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
      // Default parameters
      let type = 'level';
      let count = 10;
      
      // Parse arguments
      if (args[0]) {
        const validTypes = ['level', 'exp', 'experience', 'money', 'messages', 'msgs'];
        const requestedType = args[0].toLowerCase();
        
        if (validTypes.includes(requestedType)) {
          if (requestedType === 'exp' || requestedType === 'experience') {
            type = 'exp';
          } else if (requestedType === 'messages' || requestedType === 'msgs') {
            type = 'messages';
          } else if (requestedType === 'money') {
            type = 'money';
          }
        }
      }
      
      if (args[1]) {
        const requestedCount = parseInt(args[1]);
        if (!isNaN(requestedCount) && requestedCount > 0) {
          count = Math.min(requestedCount, 20); // Limit to 20 to avoid spam
        }
      }
      
      // Get thread data for message count
      const thread = await global.Thread.findOne({ threadID });
      if (!thread) {
        return api.sendMessage('❌ Thread data not found.', threadID, messageID);
      }
      
      let leaderboard = [];
      
      if (type === 'messages') {
        // Get message count leaderboard
        const messageCountMap = thread.messageCount || new Map();
        
        // Convert Map to array of [userID, count] pairs
        const messageCountArray = Array.from(messageCountMap);
        
        // Sort by message count (descending)
        messageCountArray.sort((a, b) => b[1] - a[1]);
        
        // Get top users
        const topUsers = messageCountArray.slice(0, count);
        
        // Get user data for each top user
        for (const [userID, msgCount] of topUsers) {
          const user = await global.User.findOne({ userID });
          if (user) {
            leaderboard.push({
              userID,
              name: user.name,
              value: msgCount
            });
          }
        }
      } else {
        // Get level, exp, or money leaderboard
        const sortField = type;
        
        // For money, we need to calculate total money (wallet + bank)
        const pipeline = type === 'money' 
          ? [
              { $addFields: { totalMoney: { $add: ["$money", "$bank"] } } },
              { $sort: { totalMoney: -1 } },
              { $limit: count }
            ]
          : [
              { $sort: { [sortField]: -1 } },
              { $limit: count }
            ];
        
        // Get top users from Currency collection
        const topCurrencies = await global.Currency.aggregate(pipeline);
        
        // Get user data for each top user
        for (const currency of topCurrencies) {
          const user = await global.User.findOne({ userID: currency.userID });
          if (user) {
            leaderboard.push({
              userID: currency.userID,
              name: user.name,
              value: type === 'money' ? currency.totalMoney : currency[type]
            });
          }
        }
      }
      
      // Format leaderboard message
      let response = `🏆 𝗧𝗢𝗣 ${count} 𝗨𝗦𝗘𝗥𝗦 𝗕𝗬 ${type.toUpperCase()} 🏆\n\n`;
      
      leaderboard.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const formattedValue = type === 'money' ? user.value.toLocaleString() : user.value;
        response += `${medal} ${user.name}: ${formattedValue} ${type === 'level' ? 'levels' : type === 'exp' ? 'XP' : type === 'money' ? 'coins' : 'messages'}\n`;
      });
      
      response += `\n💡 Use '${global.config.prefix}top [level/exp/money/messages] [count]' to see different rankings.`;
      
      return api.sendMessage(response, threadID, messageID);
    } catch (error) {
      global.logger.error('Error in top command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};