/**
 * Discard Item Command
 * Allows users to discard items from their inventory
 */

module.exports = {
  config: {
    name: 'discarditem',
    aliases: ['discard', 'trashitem', 'removeitem'],
    description: 'Discard an item from your inventory',
    usage: '{prefix}discarditem [item_id] [quantity]',
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
          '❌ You must specify an item ID to discard.\n' +
          `Usage: ${global.config.prefix}discarditem [item_id] [quantity]\n\n` +
          `💡 Check your inventory with ${global.config.prefix}inventory`,
          threadID,
          messageID
        );
      }
      
      // Get item ID from args
      const itemId = args[0].toLowerCase();
      
      // Get quantity from args (default to 1 if not specified)
      const quantity = args.length > 1 && !isNaN(args[1]) ? parseInt(args[1]) : 1;
      
      if (quantity < 1) {
        return api.sendMessage('❌ Quantity must be at least 1.', threadID, messageID);
      }
      
      // Define non-discardable items
      const nonDiscardableItems = ['vip', 'bankupgrade'];
      
      // Check if item is non-discardable
      if (nonDiscardableItems.includes(itemId)) {
        return api.sendMessage(
          `❌ You cannot discard ${itemId === 'vip' ? 'VIP Status' : 'Bank Upgrade'} as it is a permanent or special item.`,
          threadID,
          messageID
        );
      }
      
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
      
      // Check if inventory exists
      if (!currency.inventory || !Array.isArray(currency.inventory) || currency.inventory.length === 0) {
        return api.sendMessage('❌ Your inventory is empty.', threadID, messageID);
      }
      
      // Filter active (non-expired) items of the specified type
      const now = new Date();
      const activeItems = currency.inventory.filter(item => 
        item.id === itemId && (!item.expiry || new Date(item.expiry) > now)
      );
      
      // Check if user has the item
      if (activeItems.length === 0) {
        return api.sendMessage(`❌ You don't have any ${itemId} in your inventory.`, threadID, messageID);
      }
      
      // Check if user has enough of the item
      if (activeItems.length < quantity) {
        return api.sendMessage(
          `❌ You only have ${activeItems.length} ${itemId} in your inventory, but you're trying to discard ${quantity}.`,
          threadID,
          messageID
        );
      }
      
      // Get item name for display
      const itemNames = {
        luckycharm: '🍀 Lucky Charm',
        expbooster: '⚡ EXP Booster',
        moneybooster: '💸 Money Booster',
        vip: '🌟 VIP Status',
        bankupgrade: '🏦 Bank Upgrade'
      };
      
      const itemName = itemNames[itemId] || itemId;
      
      // Remove the items (starting with those closest to expiry)
      let discarded = 0;
      let remainingToDiscard = quantity;
      
      // Sort items by expiry date (earliest first)
      activeItems.sort((a, b) => {
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return new Date(a.expiry) - new Date(b.expiry);
      });
      
      // Create a new inventory without the discarded items
      const newInventory = [];
      let discardedItems = [];
      
      for (const item of currency.inventory) {
        // If this is not the item we're discarding, keep it
        if (item.id !== itemId) {
          newInventory.push(item);
          continue;
        }
        
        // If this item is expired, skip it (don't add to new inventory)
        if (item.expiry && new Date(item.expiry) <= now) {
          continue;
        }
        
        // If we still need to discard items and this is the right type
        if (remainingToDiscard > 0) {
          discardedItems.push(item);
          remainingToDiscard--;
          discarded++;
        } else {
          // We've discarded enough, keep the rest
          newInventory.push(item);
        }
      }
      
      // Update the inventory
      currency.inventory = newInventory;
      await currency.save();
      
      // Format expiry info for the first discarded item
      let expiryInfo = '';
      if (discardedItems.length > 0 && discardedItems[0].expiry) {
        const expiryDate = new Date(discardedItems[0].expiry);
        const timeLeft = expiryDate - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        
        if (hoursLeft > 24) {
          const daysLeft = Math.floor(hoursLeft / 24);
          expiryInfo = ` (would have expired in ${daysLeft} day(s))`;
        } else {
          expiryInfo = ` (would have expired in ${hoursLeft} hour(s))`;
        }
      }
      
      // Send confirmation message
      return api.sendMessage(
        `✅ Successfully discarded ${discarded} ${discarded === 1 ? 'copy' : 'copies'} of ${itemName}${expiryInfo}.\n` +
        `You now have ${activeItems.length - discarded} ${activeItems.length - discarded === 1 ? 'copy' : 'copies'} left in your inventory.`,
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in discarditem command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};