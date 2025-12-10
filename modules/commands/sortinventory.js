/**
 * Sort Inventory Command
 * Allows users to sort their inventory items by different criteria
 */

module.exports = {
  config: {
    name: 'sortinventory',
    aliases: ['sortitems', 'inventorysort', 'organizeitem'],
    description: 'Sort your inventory items by different criteria',
    usage: '{prefix}sortinventory [type/expiry/name]',
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
      // Define valid sort criteria
      const validCriteria = ['type', 'expiry', 'name'];
      
      // Get sort criteria from args (default to 'type' if not specified)
      let sortBy = args.length > 0 ? args[0].toLowerCase() : 'type';
      
      // Check if sort criteria is valid
      if (!validCriteria.includes(sortBy)) {
        return api.sendMessage(
          `❌ Invalid sort criteria. Available options: ${validCriteria.join(', ')}.`,
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
      
      // Filter active (non-expired) items
      const now = new Date();
      const activeItems = currency.inventory.filter(item => !item.expiry || new Date(item.expiry) > now);
      
      if (activeItems.length === 0) {
        return api.sendMessage('❌ You have no active items in your inventory.', threadID, messageID);
      }
      
      // Define item display names
      const itemNames = {
        vip: '🌟 VIP Status',
        luckycharm: '🍀 Lucky Charm',
        bankupgrade: '🏦 Bank Upgrade',
        expbooster: '⚡ EXP Booster',
        moneybooster: '💸 Money Booster'
      };
      
      // Sort items based on criteria
      let sortedItems;
      
      switch (sortBy) {
        case 'type':
          // Sort by item type (id)
          sortedItems = [...activeItems].sort((a, b) => {
            return a.id.localeCompare(b.id);
          });
          break;
          
        case 'expiry':
          // Sort by expiry date (earliest first, permanent items last)
          sortedItems = [...activeItems].sort((a, b) => {
            if (!a.expiry) return 1;
            if (!b.expiry) return -1;
            return new Date(a.expiry) - new Date(b.expiry);
          });
          break;
          
        case 'name':
          // Sort by item name
          sortedItems = [...activeItems].sort((a, b) => {
            const nameA = itemNames[a.id] || a.id;
            const nameB = itemNames[b.id] || b.id;
            return nameA.localeCompare(nameB);
          });
          break;
          
        default:
          sortedItems = activeItems;
      }
      
      // Update inventory with sorted items
      // Keep expired items at the end (unchanged)
      const expiredItems = currency.inventory.filter(item => item.expiry && new Date(item.expiry) <= now);
      currency.inventory = [...sortedItems, ...expiredItems];
      
      // Save changes
      await currency.save();
      
      // Group items by type for display
      const itemGroups = {};
      
      for (const item of sortedItems) {
        if (!itemGroups[item.id]) {
          itemGroups[item.id] = [];
        }
        itemGroups[item.id].push(item);
      }
      
      // Prepare response message
      let response = `✅ Inventory sorted by: ${sortBy}\n\n`;
      response += `📦 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬 (${sortedItems.length} items):\n\n`;
      
      // Display sorted inventory
      if (sortBy === 'type' || sortBy === 'name') {
        // Group by item type
        for (const [itemId, items] of Object.entries(itemGroups)) {
          const itemName = itemNames[itemId] || itemId;
          response += `${itemName} (${items.length}):\n`;
          
          // Show expiry for each item
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.expiry) {
              const expiryDate = new Date(item.expiry);
              const timeLeft = expiryDate - now;
              const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
              
              if (hoursLeft > 24) {
                const daysLeft = Math.floor(hoursLeft / 24);
                response += `  • ${i + 1}: Expires in ${daysLeft} day(s)\n`;
              } else {
                response += `  • ${i + 1}: Expires in ${hoursLeft} hour(s)\n`;
              }
            } else {
              response += `  • ${i + 1}: Permanent\n`;
            }
          }
          
          response += `\n`;
        }
      } else if (sortBy === 'expiry') {
        // List all items by expiry
        for (let i = 0; i < sortedItems.length; i++) {
          const item = sortedItems[i];
          const itemName = itemNames[item.id] || item.id;
          
          if (item.expiry) {
            const expiryDate = new Date(item.expiry);
            const timeLeft = expiryDate - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            
            if (hoursLeft > 24) {
              const daysLeft = Math.floor(hoursLeft / 24);
              response += `${i + 1}. ${itemName}: Expires in ${daysLeft} day(s)\n`;
            } else {
              response += `${i + 1}. ${itemName}: Expires in ${hoursLeft} hour(s)\n`;
            }
          } else {
            response += `${i + 1}. ${itemName}: Permanent\n`;
          }
        }
      }
      
      // Add expired items count if any
      if (expiredItems.length > 0) {
        response += `\n⚠️ You have ${expiredItems.length} expired item(s) in your inventory.\n`;
        response += `Use ${global.config.prefix}cleaninventory to remove them.`;
      }
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in sortinventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};