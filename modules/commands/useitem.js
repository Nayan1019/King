/**
 * Use Item Command
 * Allows users to use items from their inventory
 */

module.exports = {
  config: {
    name: 'useitem',
    aliases: ['use', 'activate'],
    description: 'Use an item from your inventory',
    usage: '{prefix}useitem [item_id]',
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
      // Check if item ID is provided
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify an item to use.\n' +
          `Usage: ${global.config.prefix}useitem [item_id]\n\n` +
          `💡 Use ${global.config.prefix}inventory to see your items.`,
          threadID,
          messageID
        );
      }
      
      // Get item ID from args
      const itemId = args[0].toLowerCase();
      
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
          '❌ You don\'t have any items in your inventory.\n' +
          `💡 Use ${global.config.prefix}shop to buy items.`,
          threadID,
          messageID
        );
      }
      
      // Find the item in inventory
      const itemIndex = currency.inventory.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return api.sendMessage(
          `❌ You don't have any ${itemId} in your inventory.\n` +
          `💡 Use ${global.config.prefix}inventory to see your items.`,
          threadID,
          messageID
        );
      }
      
      // Check if item is expired
      const item = currency.inventory[itemIndex];
      if (item.expiry && new Date(item.expiry) < new Date()) {
        // Remove expired item
        currency.inventory.splice(itemIndex, 1);
        await currency.save();
        
        return api.sendMessage(
          `❌ This ${item.name} has expired and has been removed from your inventory.`,
          threadID,
          messageID
        );
      }
      
      // Process item usage based on item type
      let useMessage = '';
      let removeItem = true; // By default, remove item after use
      
      switch (item.id) {
        case 'vip':
          useMessage = '❌ VIP status is automatically active and cannot be manually used.';
          removeItem = false;
          break;
          
        case 'luckycharm':
          useMessage = '❌ Lucky Charm is automatically active and cannot be manually used.';
          removeItem = false;
          break;
          
        case 'expbooster':
          useMessage = '❌ EXP Booster is automatically active and cannot be manually used.';
          removeItem = false;
          break;
          
        case 'moneybooster':
          useMessage = '❌ Money Booster is automatically active and cannot be manually used.';
          removeItem = false;
          break;
          
        case 'bankupgrade':
          useMessage = '❌ Bank Upgrade is a permanent item and has already been applied to your account.';
          removeItem = false;
          break;
          
        default:
          useMessage = `❌ This item (${item.id}) cannot be used manually or doesn't have any use effect.`;
          removeItem = false;
      }
      
      // Remove item if needed
      if (removeItem) {
        currency.inventory.splice(itemIndex, 1);
        await currency.save();
      }
      
      // Send response message
      return api.sendMessage(
        {
          body: useMessage,
          mentions: [{ tag: `@${user.name}`, id: senderID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in useitem command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};