/**
 * Extend Item Command
 * Allows users to extend the duration of items in their inventory
 */

module.exports = {
  config: {
    name: 'extenditem',
    aliases: ['extend', 'renewitem', 'prolongitem'],
    description: 'Extend the duration of an item in your inventory',
    usage: '{prefix}extenditem [item_id] [quantity]',
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
          '❌ You must specify an item ID to extend.\n' +
          `Usage: ${global.config.prefix}extenditem [item_id] [quantity]\n\n` +
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
      
      // Define item database with prices and durations
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          price: 10000,
          duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          extendable: true
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          price: 5000,
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          extendable: true
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          price: 7500,
          duration: 0, // Permanent
          extendable: false
        },
        expbooster: {
          name: '⚡ EXP Booster',
          price: 3000,
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          extendable: true
        },
        moneybooster: {
          name: '💸 Money Booster',
          price: 3500,
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          extendable: true
        }
      };
      
      // Check if item exists in database
      if (!itemDatabase[itemId]) {
        return api.sendMessage(
          '❌ Invalid item ID. Available items: vip, luckycharm, expbooster, moneybooster.',
          threadID,
          messageID
        );
      }
      
      // Check if item is extendable
      if (!itemDatabase[itemId].extendable) {
        return api.sendMessage(
          `❌ ${itemDatabase[itemId].name} cannot be extended as it is a permanent item.`,
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
      
      // Calculate total cost
      const itemPrice = itemDatabase[itemId].price;
      const totalCost = itemPrice * quantity;
      
      // Check if user has enough money
      if (currency.money < totalCost) {
        return api.sendMessage(
          `❌ You don't have enough money to extend ${quantity} ${itemId}(s).\n` +
          `Required: ${totalCost.toLocaleString()} coins\n` +
          `Your balance: ${currency.money.toLocaleString()} coins`,
          threadID,
          messageID
        );
      }
      
      // Sort items by expiry date (earliest first)
      activeItems.sort((a, b) => {
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return new Date(a.expiry) - new Date(b.expiry);
      });
      
      // Determine how many items to extend (limited by quantity and available items)
      const itemsToExtend = Math.min(quantity, activeItems.length);
      
      // Extend the items
      let extended = 0;
      for (let i = 0; i < itemsToExtend; i++) {
        const itemIndex = currency.inventory.findIndex(item => 
          item.id === itemId && 
          item.expiry === activeItems[i].expiry
        );
        
        if (itemIndex !== -1) {
          // Get current expiry date
          const currentExpiry = new Date(currency.inventory[itemIndex].expiry);
          
          // Add duration to expiry date
          const newExpiry = new Date(currentExpiry.getTime() + itemDatabase[itemId].duration);
          
          // Update expiry date
          currency.inventory[itemIndex].expiry = newExpiry;
          extended++;
        }
      }
      
      // Deduct money
      const actualCost = itemPrice * extended;
      currency.money -= actualCost;
      
      // Save changes
      await currency.save();
      
      // Format expiry info for the first extended item
      let expiryInfo = '';
      if (extended > 0) {
        const firstExtendedItem = activeItems[0];
        const itemIndex = currency.inventory.findIndex(item => 
          item.id === itemId && 
          item.expiry === firstExtendedItem.expiry
        );
        
        if (itemIndex !== -1) {
          const expiryDate = new Date(currency.inventory[itemIndex].expiry);
          const timeLeft = expiryDate - now;
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          
          if (hoursLeft > 24) {
            const daysLeft = Math.floor(hoursLeft / 24);
            expiryInfo = `\nYour earliest ${itemId} now expires in ${daysLeft} day(s).`;
          } else {
            expiryInfo = `\nYour earliest ${itemId} now expires in ${hoursLeft} hour(s).`;
          }
        }
      }
      
      // Send confirmation message
      return api.sendMessage(
        `✅ Successfully extended ${extended} ${extended === 1 ? 'copy' : 'copies'} of ${itemDatabase[itemId].name}.\n` +
        `Cost: ${actualCost.toLocaleString()} coins\n` +
        `Remaining balance: ${currency.money.toLocaleString()} coins${expiryInfo}`,
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in extenditem command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};