/**
 * Manage Inventory Command
 * Admin command to manage user inventories
 */

module.exports = {
  config: {
    name: 'manageinventory',
    aliases: ['adminitems', 'manageitems', 'moditems'],
    description: 'Admin command to manage user inventories',
    usage: '{prefix}manageinventory [add/remove/clear] [@user] [item_id] [duration_hours]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'ADMIN', // Admin only command
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
      // Check if user has permission
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      // Check if action is provided
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify an action.\n\n' +
          `Usage: ${global.config.prefix}manageinventory [add/remove/clear] [@user] [item_id] [duration_hours]\n\n` +
          `Examples:\n` +
          `${global.config.prefix}manageinventory add @user luckycharm 24\n` +
          `${global.config.prefix}manageinventory remove @user expbooster\n` +
          `${global.config.prefix}manageinventory clear @user`,
          threadID,
          messageID
        );
      }
      
      // Get action from args
      const action = args[0].toLowerCase();
      
      // Check if action is valid
      if (!['add', 'remove', 'clear'].includes(action)) {
        return api.sendMessage(
          '❌ Invalid action. Available actions: add, remove, clear.',
          threadID,
          messageID
        );
      }
      
      // Check if user is mentioned
      if (Object.keys(mentions).length === 0) {
        return api.sendMessage(
          '❌ You must mention a user to manage their inventory.',
          threadID,
          messageID
        );
      }
      
      // Get target user ID
      const targetID = Object.keys(mentions)[0];
      
      // Get target user data
      const targetUser = await global.User.findOne({ userID: targetID });
      if (!targetUser) {
        return api.sendMessage('❌ Target user data was not found.', threadID, messageID);
      }
      
      // Get target user's currency data
      let targetCurrency = await global.Currency.findOne({ userID: targetID });
      
      // Create target user's currency data if it doesn't exist
      if (!targetCurrency) {
        targetCurrency = await global.Currency.create({
          userID: targetID,
          exp: 0,
          level: 1,
          money: 100,
          bank: 0,
          bankCapacity: 5000,
          inventory: [],
          lastUpdated: new Date()
        });
      }
      
      // Initialize inventory if it doesn't exist
      if (!targetCurrency.inventory) {
        targetCurrency.inventory = [];
      }
      
      // Handle different actions
      switch (action) {
        case 'add': {
          // Check if item ID is provided
          if (args.length < 3) {
            return api.sendMessage(
              '❌ You must specify an item ID to add.\n' +
              `Usage: ${global.config.prefix}manageinventory add @user [item_id] [duration_hours]`,
              threadID,
              messageID
            );
          }
          
          // Get item ID from args
          const itemId = args[2].toLowerCase();
          
          // Define available items
          const availableItems = {
            vip: {
              name: '🌟 VIP Status',
              description: 'Get VIP status with special perks',
              defaultDuration: 24 * 7 // 7 days
            },
            luckycharm: {
              name: '🍀 Lucky Charm',
              description: 'Increases your luck in gambling',
              defaultDuration: 24 // 24 hours
            },
            bankupgrade: {
              name: '🏦 Bank Upgrade',
              description: 'Increases your bank capacity',
              defaultDuration: null // Permanent
            },
            expbooster: {
              name: '⚡ EXP Booster',
              description: 'Boosts your EXP gain',
              defaultDuration: 24 // 24 hours
            },
            moneybooster: {
              name: '💸 Money Booster',
              description: 'Boosts your money gain',
              defaultDuration: 24 // 24 hours
            }
          };
          
          // Check if item exists
          if (!availableItems[itemId]) {
            return api.sendMessage(
              '❌ Invalid item ID. Available items: vip, luckycharm, bankupgrade, expbooster, moneybooster.',
              threadID,
              messageID
            );
          }
          
          // Get item details
          const item = availableItems[itemId];
          
          // Create inventory item
          const inventoryItem = {
            id: itemId,
            name: item.name,
            description: item.description,
            purchaseDate: new Date()
          };
          
          // Add expiry date if applicable
          if (item.defaultDuration !== null) {
            // Get duration from args or use default
            const durationHours = args[3] ? parseInt(args[3]) : item.defaultDuration;
            
            if (!isNaN(durationHours) && durationHours > 0) {
              const expiryDate = new Date();
              expiryDate.setHours(expiryDate.getHours() + durationHours);
              inventoryItem.expiry = expiryDate;
            }
          }
          
          // Add item to inventory
          targetCurrency.inventory.push(inventoryItem);
          
          // Apply special effects for certain items
          if (itemId === 'bankupgrade') {
            targetCurrency.bankCapacity += 10000;
          }
          
          // Save changes
          await targetCurrency.save();
          
          // Format expiry message
          let expiryMessage = '';
          if (inventoryItem.expiry) {
            const expiryDate = new Date(inventoryItem.expiry);
            const hours = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60));
            
            if (hours > 24) {
              const days = Math.floor(hours / 24);
              expiryMessage = `(expires in ${days} days)`;
            } else {
              expiryMessage = `(expires in ${hours} hours)`;
            }
          } else {
            expiryMessage = '(permanent)';
          }
          
          // Send confirmation message
          return api.sendMessage(
            {
              body: `✅ Added ${inventoryItem.name} ${expiryMessage} to @${targetUser.name}'s inventory.`,
              mentions: [{ tag: `@${targetUser.name}`, id: targetID }]
            },
            threadID,
            messageID
          );
        }
        
        case 'remove': {
          // Check if item ID is provided
          if (args.length < 3) {
            return api.sendMessage(
              '❌ You must specify an item ID to remove.\n' +
              `Usage: ${global.config.prefix}manageinventory remove @user [item_id]`,
              threadID,
              messageID
            );
          }
          
          // Get item ID from args
          const itemId = args[2].toLowerCase();
          
          // Check if user has the item
          const itemIndex = targetCurrency.inventory.findIndex(item => item.id === itemId);
          
          if (itemIndex === -1) {
            return api.sendMessage(
              `❌ @${targetUser.name} doesn't have any ${itemId} in their inventory.`,
              threadID,
              messageID
            );
          }
          
          // Get item details
          const removedItem = targetCurrency.inventory[itemIndex];
          
          // Remove item from inventory
          targetCurrency.inventory.splice(itemIndex, 1);
          
          // Revert special effects for certain items
          if (itemId === 'bankupgrade') {
            // Don't revert bank capacity as it's a permanent upgrade
          }
          
          // Save changes
          await targetCurrency.save();
          
          // Send confirmation message
          return api.sendMessage(
            {
              body: `✅ Removed ${removedItem.name} from @${targetUser.name}'s inventory.`,
              mentions: [{ tag: `@${targetUser.name}`, id: targetID }]
            },
            threadID,
            messageID
          );
        }
        
        case 'clear': {
          // Check if inventory is already empty
          if (targetCurrency.inventory.length === 0) {
            return api.sendMessage(
              `✅ @${targetUser.name}'s inventory is already empty.`,
              threadID,
              messageID
            );
          }
          
          // Store inventory count before clearing
          const itemCount = targetCurrency.inventory.length;
          
          // Clear inventory
          targetCurrency.inventory = [];
          
          // Save changes
          await targetCurrency.save();
          
          // Send confirmation message
          return api.sendMessage(
            {
              body: `✅ Cleared @${targetUser.name}'s inventory. Removed ${itemCount} item(s).`,
              mentions: [{ tag: `@${targetUser.name}`, id: targetID }]
            },
            threadID,
            messageID
          );
        }
      }
      
    } catch (error) {
      global.logger.error('Error in manageinventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};