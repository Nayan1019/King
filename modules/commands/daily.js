/**
 * Daily Command
 * Allows users to claim daily rewards
 */

module.exports = {
  config: {
    name: 'daily',
    aliases: ['dailyreward', 'claim'],
    description: 'Claim your daily reward',
    usage: '{prefix}daily',
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
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get user currency data
      let currency = await global.Currency.findOne({ userID: senderID });
      
      // Create if not exists
      if (!currency) {
        currency = await global.Currency.create({ userID: senderID });
      }
      
      // Check if daily reward was already claimed
      if (currency.daily) {
        const lastClaim = new Date(currency.daily);
        const now = new Date();
        
        // Reset daily at midnight
        const tomorrow = new Date(lastClaim);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        if (now < tomorrow) {
          // Calculate time until reset
          const timeLeft = tomorrow - now;
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          return global.api.sendMessage(
            `❌ You've already claimed your daily reward today. You can claim again in ${hours}h ${minutes}m.`,
            threadID,
            messageID
          );
        }
      }
      
      // Calculate reward based on level (base 100 + 50 per level)
      const reward = 100 + (currency.level * 50);
      
      // Update currency
      currency.money += reward;
      currency.daily = new Date();
      await currency.save();
      
      // Calculate streak (future implementation)
      
      // Send success message
      return global.api.sendMessage(
        `✅ Daily reward claimed!\n` +
        `💰 You received ${reward} coins\n` +
        `💵 Your balance: ${currency.money} coins`,
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in daily command:', error.message);
      return global.api.sendMessage(
        '❌ An error occurred while processing your daily reward. Please try again later.',
        threadID,
        messageID
      );
    }
  }
};