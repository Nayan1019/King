/**
 * Clean Inventory Command
 * Removes expired items from a user's inventory
 */

module.exports = {
  config: {
    name: 'cleaninventory',
    aliases: ['cleaninv', 'clearinv', 'purgeinv'],
    description: 'Remove expired items from your inventory',
    usage: '{prefix}cleaninventory',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
    category: 'INVENTORY'
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
        return api.sendMessage('❌ Your user data was not found.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: senderID });
      if (!currency) {
        return api.sendMessage('❌ Your currency data was not found.', threadID, messageID);
      }
      
      // Check if user has inventory
      if (!currency.inventory || !Array.isArray(currency.inventory) || currency.inventory.length === 0) {
        return api.sendMessage(
          '✅ Your inventory is already empty. Nothing to clean.',
          threadID,
          messageID
        );
      }
      
      const now = new Date();
      const initialCount = currency.inventory.length;
      
      // Find expired items
      const expiredItems = currency.inventory.filter(item => 
        item.expiry && new Date(item.expiry) < now
      );
      
      // If no expired items
      if (expiredItems.length === 0) {
        return api.sendMessage(
          '✅ No expired items found in your inventory.',
          threadID,
          messageID
        );
      }
      
      // Group expired items by type
      const expiredItemCounts = {};
      expiredItems.forEach(item => {
        if (expiredItemCounts[item.id]) {
          expiredItemCounts[item.id].count++;
        } else {
          expiredItemCounts[item.id] = {
            name: item.name,
            count: 1
          };
        }
      });
      
      // Remove expired items
      currency.inventory = currency.inventory.filter(item => 
        !item.expiry || new Date(item.expiry) >= now
      );
      
      // Save changes
      await currency.save();
      
      // Format response message
      let response = `🧹 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬 𝗖𝗟𝗘𝗔𝗡𝗘𝗗\n\n`;
      response += `Removed ${expiredItems.length} expired item(s):\n\n`;
      
      // List removed items
      Object.keys(expiredItemCounts).forEach(itemId => {
        const item = expiredItemCounts[itemId];
        response += `- ${item.name} (×${item.count})\n`;
      });
      
      response += `\n📊 Inventory: ${initialCount} → ${currency.inventory.length} items`;
      
      // Send response
      return api.sendMessage(
        {
          body: response,
          mentions: [{ tag: `@${user.name}`, id: senderID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in cleaninventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};