/**
 * Global Inventory Command
 * Shows statistics about all users' inventories
 */

module.exports = {
  config: {
    name: 'globalinventory',
    aliases: ['globalinv', 'allinventories', 'serverinventory'],
    description: 'View statistics about all inventories on the server',
    usage: '{prefix}globalinventory',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 30
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
      // Check if user has permission
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      // Send processing message
      api.sendMessage('⏳ Processing global inventory statistics...', threadID, messageID);
      
      // Define item database with prices
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          price: 10000
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          price: 5000
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          price: 7500
        },
        expbooster: {
          name: '⚡ EXP Booster',
          price: 3000
        },
        moneybooster: {
          name: '💸 Money Booster',
          price: 3500
        }
      };
      
      // Get all currency records
      const allCurrencies = await global.Currency.find({});
      
      // Initialize statistics
      const stats = {
        totalUsers: allCurrencies.length,
        usersWithInventory: 0,
        totalItems: 0,
        activeItems: 0,
        expiredItems: 0,
        totalValue: 0,
        itemCounts: {},
        topUsers: []
      };
      
      // Current time for expiry checks
      const now = new Date();
      
      // Process each user's inventory
      for (const currency of allCurrencies) {
        // Skip users without inventory
        if (!currency.inventory || !Array.isArray(currency.inventory) || currency.inventory.length === 0) {
          continue;
        }
        
        stats.usersWithInventory++;
        
        // Count items and calculate value
        let userActiveItems = 0;
        let userExpiredItems = 0;
        let userInventoryValue = 0;
        
        for (const item of currency.inventory) {
          // Skip invalid items
          if (!item || !item.id) continue;
          
          stats.totalItems++;
          
          // Check if item is expired
          const isExpired = item.expiry && new Date(item.expiry) <= now;
          
          if (isExpired) {
            stats.expiredItems++;
            userExpiredItems++;
          } else {
            stats.activeItems++;
            userActiveItems++;
            
            // Add to item counts
            if (!stats.itemCounts[item.id]) {
              stats.itemCounts[item.id] = 0;
            }
            stats.itemCounts[item.id]++;
            
            // Calculate value
            if (itemDatabase[item.id]) {
              const itemValue = itemDatabase[item.id].price;
              stats.totalValue += itemValue;
              userInventoryValue += itemValue;
            }
          }
        }
        
        // Add to top users if they have active items
        if (userActiveItems > 0) {
          stats.topUsers.push({
            userID: currency.userID,
            activeItems: userActiveItems,
            expiredItems: userExpiredItems,
            totalValue: userInventoryValue
          });
        }
      }
      
      // Sort top users by inventory value
      stats.topUsers.sort((a, b) => b.totalValue - a.totalValue);
      
      // Keep only top 5 users
      stats.topUsers = stats.topUsers.slice(0, 5);
      
      // Prepare response message
      let response = `📊 𝗚𝗟𝗢𝗕𝗔𝗟 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n\n`;
      
      // General statistics
      response += `📈 General Stats:\n`;
      response += `- Total Users: ${stats.totalUsers}\n`;
      response += `- Users with Inventory: ${stats.usersWithInventory}\n`;
      response += `- Total Items: ${stats.totalItems}\n`;
      response += `- Active Items: ${stats.activeItems}\n`;
      response += `- Expired Items: ${stats.expiredItems}\n`;
      response += `- Total Value: ${stats.totalValue.toLocaleString()} coins\n\n`;
      
      // Item distribution
      response += `📦 Item Distribution:\n`;
      
      // Sort items by count
      const sortedItems = Object.entries(stats.itemCounts).sort((a, b) => b[1] - a[1]);
      
      for (const [itemId, count] of sortedItems) {
        if (itemDatabase[itemId]) {
          const itemValue = count * itemDatabase[itemId].price;
          const percentage = Math.round((count / stats.activeItems) * 100) || 0;
          
          response += `- ${itemDatabase[itemId].name}: ${count} (${percentage}%, ${itemValue.toLocaleString()} coins)\n`;
        } else {
          response += `- ${itemId}: ${count}\n`;
        }
      }
      
      // Top users by inventory value
      if (stats.topUsers.length > 0) {
        response += `\n💰 Top Users by Inventory Value:\n`;
        
        for (let i = 0; i < stats.topUsers.length; i++) {
          const userData = stats.topUsers[i];
          
          // Get user name
          let userName = userData.userID;
          const user = await global.User.findOne({ userID: userData.userID });
          if (user && user.name) {
            userName = user.name;
          }
          
          response += `${i + 1}. ${userName}: ${userData.activeItems} items, ${userData.totalValue.toLocaleString()} coins\n`;
        }
      }
      
      // Add recommendations
      if (stats.expiredItems > 0) {
        const expiredPercentage = Math.round((stats.expiredItems / stats.totalItems) * 100) || 0;
        
        response += `\n⚠️ ${stats.expiredItems} expired items (${expiredPercentage}% of total) detected.\n`;
        response += `Recommend users to run ${global.config.prefix}cleaninventory to remove expired items.`;
      }
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in globalinventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};