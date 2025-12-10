/**
 * Check Currency Command
 * Debug command to check currency records in the database
 */

module.exports = {
  config: {
    name: 'checkcurrency',
    aliases: ['currencycheck', 'dbcheck'],
    description: 'Check currency records in the database',
    usage: '{prefix}checkcurrency [@user]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'ADMIN'
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
      // Determine whose currency to check
      let targetID = senderID;
      let isOwnCurrency = true;
      
      // If user mentioned someone, check their currency instead
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        isOwnCurrency = false;
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage('❌ User data not found in database.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      
      if (!currency) {
        // If currency doesn't exist, create it
        const newCurrency = await global.Currency.create({
          userID: targetID,
          exp: 0,
          level: 1,
          money: 100,
          bank: 0,
          bankCapacity: 5000,
          lastUpdated: new Date()
        });
        
        return api.sendMessage(
          `✅ Currency record was missing and has been created for ${isOwnCurrency ? 'you' : user.name}:\n\n` +
          `👤 User ID: ${targetID}\n` +
          `💰 Money: ${newCurrency.money} coins\n` +
          `🏦 Bank: ${newCurrency.bank}/${newCurrency.bankCapacity} coins\n` +
          `⭐ Level: ${newCurrency.level}\n` +
          `📊 EXP: ${newCurrency.exp}\n\n` +
          `This record was just created with default values.`,
          threadID,
          messageID
        );
      }
      
      // Format currency data message
      const title = isOwnCurrency ? '𝗬𝗢𝗨𝗥 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗗𝗔𝗧𝗔' : `${user.name.toUpperCase()}'𝗦 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗗𝗔𝗧𝗔`;
      
      let response = `💾 ${title} 💾\n\n`;
      response += `👤 User ID: ${targetID}\n`;
      response += `💵 Wallet: ${currency.money.toLocaleString()} coins\n`;
      response += `🏦 Bank: ${currency.bank.toLocaleString()} / ${currency.bankCapacity.toLocaleString()} coins\n`;
      response += `⭐ Level: ${currency.level}\n`;
      response += `📊 EXP: ${currency.exp.toLocaleString()}\n`;
      
      // Add last updated timestamp
      if (currency.lastUpdated) {
        const lastUpdated = new Date(currency.lastUpdated);
        response += `🕒 Last Updated: ${lastUpdated.toLocaleString()}\n`;
      }
      
      // Add daily claim info
      if (currency.daily) {
        const lastClaim = new Date(currency.daily);
        response += `📅 Last Daily Claim: ${lastClaim.toLocaleString()}\n`;
      } else {
        response += `📅 Daily Claim: Never claimed\n`;
      }
      
      // Add inventory info if available
      if (currency.inventory && currency.inventory.length > 0) {
        response += `\n🎒 Inventory Items: ${currency.inventory.length}\n`;
      }
      
      // Send currency data message
      return api.sendMessage(
        {
          body: response,
          mentions: isOwnCurrency ? [] : [{ tag: user.name, id: targetID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in checkcurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while checking currency data.', threadID, messageID);
    }
  }
};