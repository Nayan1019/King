/**
 * Inventory Stats Command
 * Shows statistics about a user's inventory
 */

module.exports = {
  config: {
    name: 'inventorystats',
    aliases: ['invstats', 'itemstats', 'inventoryvalue'],
    description: 'View statistics about your inventory',
    usage: '{prefix}inventorystats [mention]',
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Determine target user
      let targetID = senderID;
      let mentionName = '';
      
      // Check if a user is mentioned
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        mentionName = mentions[targetID].replace('@', '');
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your user data was not found.' 
            : '❌ User data for the mentioned person was not found.',
          threadID,
          messageID
        );
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      if (!currency) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your currency data was not found.' 
            : '❌ Currency data for the mentioned person was not found.',
          threadID,
          messageID
        );
      }
      
      // Check if inventory exists
      if (!currency.inventory || !Array.isArray(currency.inventory) || currency.inventory.length === 0) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your inventory is empty.' 
            : `❌ ${mentionName || 'This user'}'s inventory is empty.`,
          threadID,
          messageID
        );
      }
      
      // Define item database with prices
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          price: 10000,
          duration: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          price: 5000,
          duration: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          price: 7500,
          duration: 0 // Permanent
        },
        expbooster: {
          name: '⚡ EXP Booster',
          price: 3000,
          duration: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        },
        moneybooster: {
          name: '💸 Money Booster',
          price: 3500,
          duration: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        }
      };
      
      // Filter active and expired items
      const now = new Date();
      const activeItems = currency.inventory.filter(item => !item.expiry || new Date(item.expiry) > now);
      const expiredItems = currency.inventory.filter(item => item.expiry && new Date(item.expiry) <= now);
      
      // Group active items by type
      const itemGroups = {};
      
      for (const item of activeItems) {
        if (!itemGroups[item.id]) {
          itemGroups[item.id] = [];
        }
        itemGroups[item.id].push(item);
      }
      
      // Calculate inventory statistics
      let totalItems = activeItems.length;
      let totalValue = 0;
      let permanentItemsCount = 0;
      let temporaryItemsCount = 0;
      let nearExpiryCount = 0; // Items expiring within 24 hours
      let oldestItemDate = null;
      let newestItemDate = null;
      
      // Calculate value and other stats
      for (const item of activeItems) {
        // Add item value
        if (itemDatabase[item.id]) {
          totalValue += itemDatabase[item.id].price;
        }
        
        // Count permanent vs temporary items
        if (!item.expiry) {
          permanentItemsCount++;
        } else {
          temporaryItemsCount++;
          
          const expiryDate = new Date(item.expiry);
          const timeLeft = expiryDate - now;
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          
          // Check if item is expiring soon (within 24 hours)
          if (hoursLeft <= 24) {
            nearExpiryCount++;
          }
          
          // Track oldest and newest items
          if (!oldestItemDate || expiryDate < oldestItemDate) {
            oldestItemDate = expiryDate;
          }
          
          if (!newestItemDate || expiryDate > newestItemDate) {
            newestItemDate = expiryDate;
          }
        }
      }
      
      // Calculate most valuable item type
      let mostValuableType = null;
      let mostValuableValue = 0;
      
      for (const [itemId, items] of Object.entries(itemGroups)) {
        if (itemDatabase[itemId]) {
          const typeValue = items.length * itemDatabase[itemId].price;
          if (typeValue > mostValuableValue) {
            mostValuableValue = typeValue;
            mostValuableType = itemId;
          }
        }
      }
      
      // Prepare response message
      let userName = user.name || (targetID === senderID ? 'You' : mentionName || 'This user');
      let response = `📊 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n\n`;
      
      if (targetID !== senderID) {
        response += `👤 User: ${userName}\n\n`;
      }
      
      // General statistics
      response += `📦 General Stats:\n`;
      response += `- Total Items: ${totalItems}\n`;
      response += `- Total Value: ${totalValue.toLocaleString()} coins\n`;
      response += `- Permanent Items: ${permanentItemsCount}\n`;
      response += `- Temporary Items: ${temporaryItemsCount}\n`;
      
      if (nearExpiryCount > 0) {
        response += `- Items Expiring Soon: ${nearExpiryCount}\n`;
      }
      
      if (expiredItems.length > 0) {
        response += `- Expired Items: ${expiredItems.length}\n`;
      }
      
      // Item breakdown
      response += `\n📝 Item Breakdown:\n`;
      
      for (const [itemId, items] of Object.entries(itemGroups)) {
        if (itemDatabase[itemId]) {
          const itemValue = items.length * itemDatabase[itemId].price;
          const percentage = Math.round((itemValue / totalValue) * 100) || 0;
          
          response += `- ${itemDatabase[itemId].name}: ${items.length} (${itemValue.toLocaleString()} coins, ${percentage}%)\n`;
        } else {
          response += `- ${itemId}: ${items.length}\n`;
        }
      }
      
      // Most valuable collection
      if (mostValuableType && itemDatabase[mostValuableType]) {
        response += `\n💰 Most Valuable Collection: ${itemDatabase[mostValuableType].name} (${mostValuableValue.toLocaleString()} coins)\n`;
      }
      
      // Expiry information
      if (temporaryItemsCount > 0) {
        response += `\n⏳ Expiry Information:\n`;
        
        if (oldestItemDate) {
          const oldestTimeLeft = oldestItemDate - now;
          const oldestHoursLeft = Math.floor(oldestTimeLeft / (1000 * 60 * 60));
          
          if (oldestHoursLeft > 24) {
            const oldestDaysLeft = Math.floor(oldestHoursLeft / 24);
            response += `- Earliest Expiry: ${oldestDaysLeft} day(s)\n`;
          } else {
            response += `- Earliest Expiry: ${oldestHoursLeft} hour(s)\n`;
          }
        }
        
        if (newestItemDate) {
          const newestTimeLeft = newestItemDate - now;
          const newestHoursLeft = Math.floor(newestTimeLeft / (1000 * 60 * 60));
          
          if (newestHoursLeft > 24) {
            const newestDaysLeft = Math.floor(newestHoursLeft / 24);
            response += `- Latest Expiry: ${newestDaysLeft} day(s)\n`;
          } else {
            response += `- Latest Expiry: ${newestHoursLeft} hour(s)\n`;
          }
        }
      }
      
      // Add expired items note if any
      if (expiredItems.length > 0) {
        response += `\n⚠️ You have ${expiredItems.length} expired item(s) in your inventory.\n`;
        response += `Use ${global.config.prefix}cleaninventory to remove them.`;
      }
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in inventorystats command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};