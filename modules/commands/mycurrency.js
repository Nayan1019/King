/**
 * My Currency Command
 * Shows a user's detailed currency information
 */

module.exports = {
  config: {
    name: 'mycurrency',
    aliases: ['mydata', 'mystats'],
    description: 'View your detailed currency information',
    usage: '{prefix}mycurrency',
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
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ Your user data was not found in the database.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: senderID });
      
      if (!currency) {
        // If currency doesn't exist, create it
        const newCurrency = await global.Currency.create({
          userID: senderID,
          exp: 0,
          level: 1,
          money: 100,
          bank: 0,
          bankCapacity: 5000,
          lastUpdated: new Date()
        });
        
        return api.sendMessage(
          `✅ Your currency record was missing and has been created:\n\n` +
          `💰 Money: ${newCurrency.money} coins\n` +
          `🏦 Bank: ${newCurrency.bank}/${newCurrency.bankCapacity} coins\n` +
          `⭐ Level: ${newCurrency.level}\n` +
          `📊 EXP: ${newCurrency.exp}\n\n` +
          `This record was just created with default values.`,
          threadID,
          messageID
        );
      }
      
      // Calculate EXP needed for next level
      const currentLevelExp = currency.level * 10;
      const expNeeded = currentLevelExp;
      const expProgress = currency.exp;
      const expPercentage = Math.min(100, Math.floor((expProgress / expNeeded) * 100));
      
      // Create progress bar
      const progressBarLength = 10;
      const filledBlocks = Math.floor((expPercentage / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
      
      // Format currency data message
      let response = `💰 𝗬𝗢𝗨𝗥 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗗𝗔𝗧𝗔 💰\n\n`;
      response += `👤 Name: ${user.name}\n`;
      response += `💵 Wallet: ${currency.money.toLocaleString()} coins\n`;
      response += `🏦 Bank: ${currency.bank.toLocaleString()} / ${currency.bankCapacity.toLocaleString()} coins\n`;
      response += `💰 Total: ${(currency.money + currency.bank).toLocaleString()} coins\n\n`;
      response += `⭐ Level: ${currency.level}\n`;
      response += `📊 EXP: ${currency.exp.toLocaleString()} / ${expNeeded} for next level\n`;
      response += `[${progressBar}] ${expPercentage}%\n\n`;
      
      // Add daily claim info
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
          
          response += `📅 Daily Reward: Available in ${hours}h ${minutes}m\n`;
        } else {
          response += `📅 Daily Reward: Available now!\n`;
        }
      } else {
        response += `📅 Daily Reward: Available now!\n`;
      }
      
      // Add inventory info if available
      if (currency.inventory && currency.inventory.length > 0) {
        response += `\n🎒 Inventory Items: ${currency.inventory.length}\n`;
        
        // List first 3 inventory items
        const maxItems = Math.min(currency.inventory.length, 3);
        
        for (let i = 0; i < maxItems; i++) {
          const item = currency.inventory[i];
          response += `- ${item.id || 'Unknown item'}`;
          
          if (item.expiry) {
            const expiry = new Date(item.expiry);
            const now = new Date();
            
            if (expiry > now) {
              // Calculate time remaining
              const timeLeft = expiry - now;
              const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
              response += ` (expires in ${hoursLeft}h)`;
            } else {
              response += ` (expired)`;
            }
          }
          
          response += `\n`;
        }
        
        // Add note if there are more items
        if (currency.inventory.length > maxItems) {
          response += `...and ${currency.inventory.length - maxItems} more items\n`;
        }
      } else {
        response += `\n🎒 Inventory: Empty\n`;
      }
      
      // Add tips
      response += `\n💡 Tips:\n`;
      response += `- Use ${global.config.prefix}daily to claim your daily reward\n`;
      response += `- Use ${global.config.prefix}bank to manage your bank account\n`;
      response += `- Use ${global.config.prefix}work to earn more coins\n`;
      
      // Send currency data message
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in mycurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while checking your currency data.', threadID, messageID);
    }
  }
};