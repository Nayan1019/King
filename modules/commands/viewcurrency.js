/**
 * View Currency Command
 * Admin command to view a user's currency data
 */

module.exports = {
  config: {
    name: 'viewcurrency',
    aliases: ['viewmoney', 'checkuser'],
    description: 'View a user\'s currency data (Admin only)',
    usage: '{prefix}viewcurrency @user',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN', // Only admins can use this command
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Check if user has permission
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      // Check if a user was mentioned
      if (Object.keys(mentions).length === 0) {
        return api.sendMessage('❌ Please mention a user to view their currency data.', threadID, messageID);
      }
      
      // Get the target user ID
      const targetID = Object.keys(mentions)[0];
      
      // Check if user exists
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage('❌ User data not found in the database.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      
      if (!currency) {
        return api.sendMessage(
          `❌ Currency data for ${user.name} not found in the database.\n\n` +
          `Use ${global.config.prefix}fixcurrency to fix missing records.`,
          threadID,
          messageID
        );
      }
      
      // Format currency data message
      let response = `💾 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗗𝗔𝗧𝗔 𝗙𝗢𝗥 ${user.name.toUpperCase()} 💾\n\n`;
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
        
        // List first 5 inventory items
        const maxItems = Math.min(currency.inventory.length, 5);
        response += `Items (showing ${maxItems}/${currency.inventory.length}):\n`;
        
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
      } else {
        response += `\n🎒 Inventory: Empty\n`;
      }
      
      // Add MongoDB document ID for reference
      response += `\n🔑 Document ID: ${currency._id}\n`;
      
      // Send currency data message
      return api.sendMessage(
        {
          body: response,
          mentions: [{ tag: user.name, id: targetID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in viewcurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while viewing currency data.', threadID, messageID);
    }
  }
};