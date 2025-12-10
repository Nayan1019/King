/**
 * Search Item Command
 * Allows users to search for items in their inventory
 */

module.exports = {
  config: {
    name: 'searchitem',
    aliases: ['finditem', 'locateitem', 'itemsearch'],
    description: 'Search for items in your inventory',
    usage: '{prefix}searchitem [item_id/name]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5
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
      // Check if search query is provided
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify an item ID or name to search for.\n' +
          `Usage: ${global.config.prefix}searchitem [item_id/name]\n\n` +
          `💡 Example: ${global.config.prefix}searchitem lucky`,
          threadID,
          messageID
        );
      }
      
      // Get search query from args
      const searchQuery = args.join(' ').toLowerCase();
      
      // Define item database with names and aliases
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          aliases: ['vip', 'vipstatus', 'status'],
          price: 10000
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          aliases: ['lucky', 'charm', 'luckycharm', 'luck'],
          price: 5000
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          aliases: ['bank', 'upgrade', 'bankupgrade', 'capacity'],
          price: 7500
        },
        expbooster: {
          name: '⚡ EXP Booster',
          aliases: ['exp', 'xp', 'expbooster', 'experience', 'booster'],
          price: 3000
        },
        moneybooster: {
          name: '💸 Money Booster',
          aliases: ['money', 'cash', 'moneybooster', 'coin', 'coins'],
          price: 3500
        }
      };
      
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
      
      // Find matching item types
      const matchingItemTypes = [];
      
      for (const [itemId, itemInfo] of Object.entries(itemDatabase)) {
        if (itemId === searchQuery || 
            itemInfo.name.toLowerCase().includes(searchQuery) || 
            itemInfo.aliases.some(alias => alias.includes(searchQuery))) {
          matchingItemTypes.push(itemId);
        }
      }
      
      if (matchingItemTypes.length === 0) {
        return api.sendMessage(
          `❌ No items matching "${searchQuery}" were found in the item database.\n` +
          `Available items: vip, luckycharm, bankupgrade, expbooster, moneybooster`,
          threadID,
          messageID
        );
      }
      
      // Filter active (non-expired) items of the matching types
      const now = new Date();
      const matchingItems = currency.inventory.filter(item => 
        matchingItemTypes.includes(item.id) && (!item.expiry || new Date(item.expiry) > now)
      );
      
      if (matchingItems.length === 0) {
        return api.sendMessage(
          `❌ You don't have any items matching "${searchQuery}" in your inventory.`,
          threadID,
          messageID
        );
      }
      
      // Group matching items by type
      const itemGroups = {};
      
      for (const item of matchingItems) {
        if (!itemGroups[item.id]) {
          itemGroups[item.id] = [];
        }
        itemGroups[item.id].push(item);
      }
      
      // Prepare response message
      let response = `🔍 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦 𝗙𝗢𝗥: "${searchQuery}"\n\n`;
      response += `Found ${matchingItems.length} matching item(s) in your inventory:\n\n`;
      
      // Display matching items
      for (const [itemId, items] of Object.entries(itemGroups)) {
        const itemInfo = itemDatabase[itemId];
        response += `${itemInfo.name} (${items.length}):\n`;
        response += `- Value: ${itemInfo.price.toLocaleString()} coins each\n`;
        response += `- Total Value: ${(items.length * itemInfo.price).toLocaleString()} coins\n`;
        
        // Show expiry for each item
        if (items.some(item => item.expiry)) {
          response += `- Expiry:\n`;
          
          // Sort items by expiry date (earliest first)
          const sortedItems = [...items].filter(item => item.expiry).sort((a, b) => {
            return new Date(a.expiry) - new Date(b.expiry);
          });
          
          // Show expiry for up to 5 items
          const itemsToShow = sortedItems.slice(0, 5);
          
          for (let i = 0; i < itemsToShow.length; i++) {
            const item = itemsToShow[i];
            const expiryDate = new Date(item.expiry);
            const timeLeft = expiryDate - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            
            if (hoursLeft > 24) {
              const daysLeft = Math.floor(hoursLeft / 24);
              response += `  • ${i + 1}: ${daysLeft} day(s) remaining\n`;
            } else {
              response += `  • ${i + 1}: ${hoursLeft} hour(s) remaining\n`;
            }
          }
          
          // If there are more items, show a summary
          if (sortedItems.length > 5) {
            response += `  • +${sortedItems.length - 5} more...\n`;
          }
        } else if (itemId === 'bankupgrade') {
          response += `- Permanent upgrade\n`;
        }
        
        response += `\n`;
      }
      
      // Add related commands
      response += `💡 Related Commands:\n`;
      response += `- ${global.config.prefix}iteminfo [item_id]: View detailed item information\n`;
      response += `- ${global.config.prefix}inventory: View your complete inventory\n`;
      response += `- ${global.config.prefix}itemstatus: Check active item effects\n`;
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in searchitem command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};