/**
 * Fix Inventory Command
 * Allows administrators to fix inventory issues for users
 */

module.exports = {
  config: {
    name: 'fixinventory',
    aliases: ['repairinventory', 'inventoryfix'],
    description: 'Fix inventory issues for users',
    usage: '{prefix}fixinventory [userID/mention]',
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Check if user has permission
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      // Determine target user
      let targetID;
      
      if (Object.keys(mentions).length > 0) {
        // If user is mentioned
        targetID = Object.keys(mentions)[0];
      } else if (args.length > 0) {
        // If userID is provided as argument
        targetID = args[0];
      } else {
        // Default to sender
        targetID = senderID;
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage(`❌ User data for ID ${targetID} was not found.`, threadID, messageID);
      }
      
      // Get currency data
      let currency = await global.Currency.findOne({ userID: targetID });
      
      // If currency data doesn't exist, create it
      if (!currency) {
        currency = new global.Currency({
          userID: targetID,
          exp: 0,
          level: 1,
          money: 100,
          bank: 0,
          bankCapacity: 5000,
          daily: { claimed: false, claimedAt: null },
          lastUpdated: new Date(),
          inventory: []
        });
        
        await currency.save();
        api.sendMessage(`✅ Created new currency record for user ${targetID}.`, threadID, messageID);
      }
      
      // Fix inventory issues
      let fixedIssues = 0;
      
      // 1. Ensure inventory exists and is an array
      if (!currency.inventory || !Array.isArray(currency.inventory)) {
        currency.inventory = [];
        fixedIssues++;
      }
      
      // 2. Remove null or undefined items
      const initialLength = currency.inventory.length;
      currency.inventory = currency.inventory.filter(item => item && typeof item === 'object');
      if (currency.inventory.length !== initialLength) {
        fixedIssues++;
      }
      
      // 3. Fix item structure issues
      for (let i = 0; i < currency.inventory.length; i++) {
        const item = currency.inventory[i];
        
        // Ensure item has an id
        if (!item.id) {
          currency.inventory.splice(i, 1);
          i--;
          fixedIssues++;
          continue;
        }
        
        // Normalize item id to lowercase
        if (item.id !== item.id.toLowerCase()) {
          item.id = item.id.toLowerCase();
          fixedIssues++;
        }
        
        // Ensure expiry is a valid date or null
        if (item.expiry) {
          try {
            const expiryDate = new Date(item.expiry);
            if (isNaN(expiryDate.getTime())) {
              item.expiry = null;
              fixedIssues++;
            }
          } catch (e) {
            item.expiry = null;
            fixedIssues++;
          }
        }
      }
      
      // 4. Remove expired items
      const now = new Date();
      const initialExpiredCount = currency.inventory.length;
      currency.inventory = currency.inventory.filter(item => !item.expiry || new Date(item.expiry) > now);
      const removedExpired = initialExpiredCount - currency.inventory.length;
      if (removedExpired > 0) {
        fixedIssues++;
      }
      
      // 5. Check for duplicate VIP entries and merge them
      const vipItems = currency.inventory.filter(item => item.id === 'vip');
      if (vipItems.length > 1) {
        // Sort by expiry date (latest first)
        vipItems.sort((a, b) => {
          if (!a.expiry) return -1;
          if (!b.expiry) return 1;
          return new Date(b.expiry) - new Date(a.expiry);
        });
        
        // Keep only the one with the latest expiry
        const latestVIP = vipItems[0];
        currency.inventory = currency.inventory.filter(item => item.id !== 'vip');
        currency.inventory.push(latestVIP);
        fixedIssues++;
      }
      
      // 6. Check for excessive stacking of items
      const itemCounts = {};
      const maxStacks = {
        'luckycharm': 3,
        'expbooster': 3,
        'moneybooster': 3
      };
      
      for (const item of currency.inventory) {
        if (!itemCounts[item.id]) {
          itemCounts[item.id] = 0;
        }
        itemCounts[item.id]++;
      }
      
      for (const [itemId, count] of Object.entries(itemCounts)) {
        if (maxStacks[itemId] && count > maxStacks[itemId]) {
          // Sort items by expiry (latest first)
          const items = currency.inventory.filter(item => item.id === itemId);
          items.sort((a, b) => {
            if (!a.expiry) return -1;
            if (!b.expiry) return 1;
            return new Date(b.expiry) - new Date(a.expiry);
          });
          
          // Keep only the allowed number of items
          const keepItems = items.slice(0, maxStacks[itemId]);
          currency.inventory = currency.inventory.filter(item => item.id !== itemId);
          currency.inventory.push(...keepItems);
          fixedIssues++;
        }
      }
      
      // Save changes
      await currency.save();
      
      // Get user name
      let userName = user.name || targetID;
      
      // Prepare response message
      let response = `✅ Inventory fix completed for ${userName}\n\n`;
      response += `📊 Results:\n`;
      response += `- Issues fixed: ${fixedIssues}\n`;
      response += `- Expired items removed: ${removedExpired}\n`;
      response += `- Current inventory size: ${currency.inventory.length} item(s)\n\n`;
      
      // Add inventory summary
      if (currency.inventory.length > 0) {
        const itemCounts = {};
        
        for (const item of currency.inventory) {
          if (!itemCounts[item.id]) {
            itemCounts[item.id] = 0;
          }
          itemCounts[item.id]++;
        }
        
        response += `📦 Inventory Summary:\n`;
        
        for (const [itemId, count] of Object.entries(itemCounts)) {
          const itemNames = {
            'vip': '🌟 VIP Status',
            'luckycharm': '🍀 Lucky Charm',
            'bankupgrade': '🏦 Bank Upgrade',
            'expbooster': '⚡ EXP Booster',
            'moneybooster': '💸 Money Booster'
          };
          
          const itemName = itemNames[itemId] || itemId;
          response += `- ${itemName}: ${count}\n`;
        }
      } else {
        response += `📦 Inventory is empty.`;
      }
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in fixinventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};