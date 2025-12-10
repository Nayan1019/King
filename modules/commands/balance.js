/**
 * Balance Command
 * Shows a user's money balance
 */

module.exports = {
  config: {
    name: 'balance',
    aliases: ['bal', 'money', 'wallet'],
    description: 'Check your money balance or another user\'s balance',
    usage: '{prefix}balance [@user]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'ECONOMY'
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Determine whose balance to check
      let targetID = senderID;
      let isOwnBalance = true;
      
      // If user mentioned someone, check their balance instead
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        isOwnBalance = false;
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      if (!currency) {
        return api.sendMessage('❌ Currency data not found.', threadID, messageID);
      }
      
      // Format balance message
      const title = isOwnBalance ? '𝗬𝗢𝗨𝗥 𝗕𝗔𝗟𝗔𝗡𝗖𝗘' : `${user.name.toUpperCase()}'𝗦 𝗕𝗔𝗟𝗔𝗡𝗖𝗘`;
      
      let response = `💰 ${title} 💰\n\n`;
      response += `👤 ${isOwnBalance ? 'Your' : user.name + '\'s'} Stats:\n`;
      response += `💵 Wallet: ${currency.money.toLocaleString()} coins\n`;
      response += `🏦 Bank: ${currency.bank.toLocaleString()} / ${currency.bankCapacity.toLocaleString()} coins\n`;
      response += `💰 Total: ${(currency.money + currency.bank).toLocaleString()} coins\n\n`;
      response += `⭐ Level: ${currency.level}\n`;
      response += `📊 EXP: ${currency.exp.toLocaleString()}\n`;
      
      // Calculate EXP needed for next level
      const expNeeded = currency.level * 10; // Match the formula in handleDatabase.js
      const expProgress = Math.min(currency.exp, expNeeded); // Ensure progress doesn't exceed needed
      const expPercentage = Math.floor((expProgress / expNeeded) * 100);
      
      // Create progress bar
      const progressBarLength = 10;
      const filledBlocks = Math.floor((expPercentage / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
      
      response += `📈 Progress to Level ${currency.level + 1}: ${expProgress}/${expNeeded} EXP\n`;
      response += `[${progressBar}] ${expPercentage}%`;
      
      // Send balance message
      return api.sendMessage(
        {
          body: response,
          mentions: isOwnBalance ? [] : [{ tag: user.name, id: targetID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in balance command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};