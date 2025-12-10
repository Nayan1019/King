/**
 * Shop Command
 * Allows users to buy items with their money
 */

module.exports = {
  config: {
    name: 'shop',
    aliases: ['store', 'market'],
    description: 'View and buy items from the shop',
    usage: '{prefix}shop [buy] [item] [quantity]',
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
      // Define shop items
      const shopItems = [
        {
          id: 'vip',
          name: '🌟 VIP Status',
          description: 'Get VIP status with special perks',
          price: 10000,
          effects: 'Reduced cooldowns, higher work earnings, special badge'
        },
        {
          id: 'luckycharm',
          name: '🍀 Lucky Charm',
          description: 'Increases your luck in gambling',
          price: 5000,
          effects: 'Increases win chance in gamble by 10%'
        },
        {
          id: 'bankupgrade',
          name: '🏦 Bank Upgrade',
          description: 'Increases your bank capacity',
          price: 7500,
          effects: 'Increases bank capacity by 10000'
        },
        {
          id: 'expbooster',
          name: '⚡ EXP Booster',
          description: 'Boosts your EXP gain',
          price: 3000,
          effects: 'Increases EXP gain by 50% for 24 hours'
        },
        {
          id: 'moneybooster',
          name: '💸 Money Booster',
          description: 'Boosts your money gain',
          price: 3500,
          effects: 'Increases money gain by 50% for 24 hours'
        }
      ];
      
      // If no arguments, show shop
      if (args.length === 0) {
        let shopMessage = `🛒 𝗦𝗛𝗢𝗣\n\n`;
        
        shopItems.forEach((item, index) => {
          shopMessage += `${index + 1}. ${item.name} - ${item.price} coins\n`;
          shopMessage += `   ${item.description}\n`;
          shopMessage += `   Effects: ${item.effects}\n\n`;
        });
        
        shopMessage += `\n💡 To buy an item, use: ${global.config.prefix}shop buy [item] [quantity]\n`;
        shopMessage += `Example: ${global.config.prefix}shop buy luckycharm 1`;
        
        return api.sendMessage(shopMessage, threadID, messageID);
      }
      
      // Handle buy command
      if (args[0].toLowerCase() === 'buy') {
        // Check if item is specified
        if (!args[1]) {
          return api.sendMessage('❌ Please specify an item to buy.', threadID, messageID);
        }
        
        // Find the item
        const itemId = args[1].toLowerCase();
        const item = shopItems.find(i => i.id === itemId);
        
        if (!item) {
          return api.sendMessage(
            `❌ Item not found. Use ${global.config.prefix}shop to see available items.`,
            threadID,
            messageID
          );
        }
        
        // Parse quantity
        const quantity = parseInt(args[2]) || 1;
        if (quantity <= 0) {
          return api.sendMessage('❌ Quantity must be a positive number.', threadID, messageID);
        }
        
        // Calculate total price
        const totalPrice = item.price * quantity;
        
        // Get user's currency data
        let userCurrency = await global.Currency.findOne({ userID: senderID });
        if (!userCurrency) {
          return api.sendMessage('❌ Your currency data not found.', threadID, messageID);
        }
        
        // Check if user has enough money
        if (userCurrency.money < totalPrice) {
          return api.sendMessage(
            `❌ You don't have enough money to buy ${quantity} ${item.name}. You need ${totalPrice} coins, but you only have ${userCurrency.money} coins.`,
            threadID,
            messageID
          );
        }
        
        // Process the purchase based on item type
        let purchaseMessage = '';
        
        // Create inventory item with expiry date for time-limited items
        const createInventoryItem = (itemId, expiryHours = null) => {
          const inventoryItem = {
            id: itemId,
            name: item.name,
            description: item.description,
            purchaseDate: new Date()
          };
          
          // Add expiry date if specified
          if (expiryHours) {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + expiryHours);
            inventoryItem.expiry = expiryDate;
          }
          
          return inventoryItem;
        };
        
        // Initialize inventory array if it doesn't exist
        if (!userCurrency.inventory) {
          userCurrency.inventory = [];
        }
        
        switch (item.id) {
          case 'vip':
            // Implementation for VIP status - 7 days duration
            for (let i = 0; i < quantity; i++) {
              userCurrency.inventory.push(createInventoryItem('vip', 24 * 7)); // 7 days
            }
            purchaseMessage = `🌟 You are now a VIP user for 7 days! Enjoy reduced cooldowns, higher work earnings, and a special badge.`;
            break;
            
          case 'luckycharm':
            // Implementation for Lucky Charm - 24 hours duration
            for (let i = 0; i < quantity; i++) {
              userCurrency.inventory.push(createInventoryItem('luckycharm', 24)); // 24 hours
            }
            purchaseMessage = `🍀 You bought a Lucky Charm! Your gambling luck has increased by 10% for the next 24 hours.`;
            break;
            
          case 'bankupgrade':
            // Implementation for Bank Upgrade - permanent
            userCurrency.bankCapacity += 10000 * quantity;
            for (let i = 0; i < quantity; i++) {
              userCurrency.inventory.push(createInventoryItem('bankupgrade')); // Permanent item
            }
            purchaseMessage = `🏦 You upgraded your bank! Your new bank capacity is ${userCurrency.bankCapacity} coins.`;
            break;
            
          case 'expbooster':
            // Implementation for EXP Booster - 24 hours duration
            for (let i = 0; i < quantity; i++) {
              userCurrency.inventory.push(createInventoryItem('expbooster', 24)); // 24 hours
            }
            purchaseMessage = `⚡ You bought an EXP Booster! Your EXP gain has increased by 50% for the next 24 hours.`;
            break;
            
          case 'moneybooster':
            // Implementation for Money Booster - 24 hours duration
            for (let i = 0; i < quantity; i++) {
              userCurrency.inventory.push(createInventoryItem('moneybooster', 24)); // 24 hours
            }
            purchaseMessage = `💸 You bought a Money Booster! Your money gain has increased by 50% for the next 24 hours.`;
            break;
            
          default:
            return api.sendMessage('❌ Error processing item purchase.', threadID, messageID);
        }
        
        // Deduct money from user
        userCurrency.money -= totalPrice;
        
        // Save changes
        await userCurrency.save();
        
        // Get user data
        const user = await global.User.findOne({ userID: senderID });
        if (!user) {
          return api.sendMessage('❌ User data not found.', threadID, messageID);
        }
        
        // Send confirmation message
        return api.sendMessage(
          {
            body: `🛍️ 𝗣𝗨𝗥𝗖𝗛𝗔𝗦𝗘 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟\n\n` +
                  `👤 @${user.name}\n` +
                  `🛒 Item: ${item.name} x${quantity}\n` +
                  `💵 Total cost: ${totalPrice} coins\n` +
                  `💰 Remaining balance: ${userCurrency.money} coins\n\n` +
                  `${purchaseMessage}`,
            mentions: [{ tag: `@${user.name}`, id: senderID }]
          },
          threadID,
          messageID
        );
      }
      
      // If command is not recognized
      return api.sendMessage(
        `❓ Unknown shop command. Available commands:\n` +
        `${global.config.prefix}shop - View the shop\n` +
        `${global.config.prefix}shop buy [item] [quantity] - Buy an item`,
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in shop command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};