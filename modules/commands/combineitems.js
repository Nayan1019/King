/**
 * Combine Items Command
 * Allows users to combine multiple items of the same type to extend duration
 */

module.exports = {
  config: {
    name: 'combineitems',
    aliases: ['combine', 'mergeitems', 'fuseitems'],
    description: 'Combine multiple items of the same type to extend duration',
    usage: '{prefix}combineitems [item_id]',
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
      // Check if item ID is provided
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify an item ID to combine.\n' +
          `Usage: ${global.config.prefix}combineitems [item_id]\n\n` +
          `💡 Example: ${global.config.prefix}combineitems luckycharm`,
          threadID,
          messageID
        );
      }
      
      // Get item ID from args
      const itemId = args[0].toLowerCase();
      
      // Define item database with durations
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          combinable: true
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          combinable: true
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          duration: 0, // Permanent
          combinable: false
        },
        expbooster: {
          name: '⚡ EXP Booster',
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          combinable: true
        },
        moneybooster: {
          name: '💸 Money Booster',
          duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          combinable: true
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
      
      // Check if item is combinable
      if (!itemDatabase[itemId].combinable) {
        return api.sendMessage(
          `❌ ${itemDatabase[itemId].name} cannot be combined as it is a permanent item.`,
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
      
      // Check if user has multiple items to combine
      if (activeItems.length < 2) {
        return api.sendMessage(
          `❌ You need at least 2 ${itemId} items to combine. You currently have only 1.`,
          threadID,
          messageID
        );
      }
      
      // Sort items by expiry date (latest first)
      activeItems.sort((a, b) => {
        if (!a.expiry) return -1;
        if (!b.expiry) return 1;
        return new Date(b.expiry) - new Date(a.expiry);
      });
      
      // Get the item with the latest expiry date
      const baseItem = activeItems[0];
      const baseExpiry = baseItem.expiry ? new Date(baseItem.expiry) : new Date(now.getTime() + itemDatabase[itemId].duration);
      
      // Calculate total duration to add
      let totalDurationToAdd = 0;
      
      // Skip the first item (base item)
      for (let i = 1; i < activeItems.length; i++) {
        const item = activeItems[i];
        
        if (item.expiry) {
          // For items with expiry, add the remaining time
          const itemExpiry = new Date(item.expiry);
          const remainingTime = itemExpiry - now;
          
          // Only add positive remaining time
          if (remainingTime > 0) {
            totalDurationToAdd += remainingTime;
          }
        } else {
          // For items without expiry, add the full duration
          totalDurationToAdd += itemDatabase[itemId].duration;
        }
      }
      
      // Calculate new expiry date
      const newExpiry = new Date(baseExpiry.getTime() + totalDurationToAdd);
      
      // Create a new inventory without the combined items
      const newInventory = [];
      let combinedCount = 0;
      
      for (const item of currency.inventory) {
        // If this is not the item we're combining, keep it
        if (item.id !== itemId) {
          newInventory.push(item);
          continue;
        }
        
        // If this item is expired, skip it (don't add to new inventory)
        if (item.expiry && new Date(item.expiry) <= now) {
          continue;
        }
        
        // Keep only the base item with updated expiry
        if (combinedCount === 0) {
          newInventory.push({
            id: itemId,
            expiry: newExpiry
          });
          combinedCount++;
        } else {
          // Skip other items of this type (they are being combined)
          combinedCount++;
        }
      }
      
      // Update the inventory
      currency.inventory = newInventory;
      await currency.save();
      
      // Calculate duration information for display
      const totalDurationHours = Math.floor(totalDurationToAdd / (1000 * 60 * 60));
      let durationDisplay = '';
      
      if (totalDurationHours > 24) {
        const durationDays = Math.floor(totalDurationHours / 24);
        const remainingHours = totalDurationHours % 24;
        durationDisplay = `${durationDays} day(s) and ${remainingHours} hour(s)`;
      } else {
        durationDisplay = `${totalDurationHours} hour(s)`;
      }
      
      // Calculate new expiry information for display
      const timeUntilExpiry = newExpiry - now;
      const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
      let expiryDisplay = '';
      
      if (hoursUntilExpiry > 24) {
        const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);
        expiryDisplay = `${daysUntilExpiry} day(s)`;
      } else {
        expiryDisplay = `${hoursUntilExpiry} hour(s)`;
      }
      
      // Send confirmation message
      return api.sendMessage(
        `✅ Successfully combined ${combinedCount} ${itemDatabase[itemId].name} items.\n\n` +
        `📊 Results:\n` +
        `- Combined: ${combinedCount} items\n` +
        `- Added Duration: ${durationDisplay}\n` +
        `- New Expiry: ${expiryDisplay} from now\n\n` +
        `💡 You now have 1 ${itemDatabase[itemId].name} with extended duration.`,
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in combineitems command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};