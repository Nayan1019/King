/**
 * Item Info Command
 * Shows detailed information about items in the shop or inventory
 */

module.exports = {
  config: {
    name: 'iteminfo',
    aliases: ['item', 'checkitem', 'itemdetails'],
    description: 'Get detailed information about an item',
    usage: '{prefix}iteminfo [item_id]',
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
      // Check if item ID is provided
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify an item ID.\n' +
          `Usage: ${global.config.prefix}iteminfo [item_id]\n\n` +
          `💡 Available items: vip, luckycharm, bankupgrade, expbooster, moneybooster`,
          threadID,
          messageID
        );
      }
      
      // Get item ID from args
      const itemId = args[0].toLowerCase();
      
      // Define item database
      const itemDatabase = {
        vip: {
          name: '🌟 VIP Status',
          description: 'Get VIP status with special perks',
          price: 10000,
          duration: '7 days',
          effects: [
            'Reduced cooldowns on commands',
            'Higher earnings from work command',
            'Special VIP badge in leaderboards',
            'Priority in certain commands'
          ],
          usage: 'Automatically active once purchased',
          stackable: true,
          maxStack: 3,
          giftable: false
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          description: 'Increases your luck in gambling',
          price: 5000,
          duration: '24 hours',
          effects: [
            'Increases win chance in gamble by 10%',
            'Stacks up to 3 times for +30% total',
            'Slightly increases rewards from daily command'
          ],
          usage: 'Automatically active once purchased',
          stackable: true,
          maxStack: 3,
          giftable: true
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          description: 'Increases your bank capacity',
          price: 7500,
          duration: 'Permanent',
          effects: [
            'Increases bank capacity by 10,000 coins',
            'Allows storing more money safely',
            'Stacks with level-based capacity increases'
          ],
          usage: 'Applied immediately upon purchase',
          stackable: true,
          maxStack: 'Unlimited',
          giftable: false
        },
        expbooster: {
          name: '⚡ EXP Booster',
          description: 'Boosts your EXP gain',
          price: 3000,
          duration: '24 hours',
          effects: [
            'Increases EXP gain by 50%',
            'Stacks up to 3 times for +150% total',
            'Helps level up faster'
          ],
          usage: 'Automatically active once purchased',
          stackable: true,
          maxStack: 3,
          giftable: true
        },
        moneybooster: {
          name: '💸 Money Booster',
          description: 'Boosts your money gain',
          price: 3500,
          duration: '24 hours',
          effects: [
            'Increases money gain by 50%',
            'Stacks up to 3 times for +150% total',
            'Applies to message rewards and work command'
          ],
          usage: 'Automatically active once purchased',
          stackable: true,
          maxStack: 3,
          giftable: true
        }
      };
      
      // Check if item exists
      if (!itemDatabase[itemId]) {
        return api.sendMessage(
          '❌ Invalid item ID. Available items: vip, luckycharm, bankupgrade, expbooster, moneybooster.',
          threadID,
          messageID
        );
      }
      
      // Get item details
      const item = itemDatabase[itemId];
      
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ Your user data was not found.', threadID, messageID);
      }
      
      // Get currency data to check if user owns the item
      const currency = await global.Currency.findOne({ userID: senderID });
      
      // Check if user owns the item and how many
      let ownedCount = 0;
      let expiryInfo = '';
      
      if (currency && currency.inventory && Array.isArray(currency.inventory)) {
        // Filter active (non-expired) items
        const now = new Date();
        const activeItems = currency.inventory.filter(invItem => 
          invItem.id === itemId && (!invItem.expiry || new Date(invItem.expiry) > now)
        );
        
        ownedCount = activeItems.length;
        
        // Get expiry info for the first active item
        if (ownedCount > 0 && activeItems[0].expiry) {
          const expiryDate = new Date(activeItems[0].expiry);
          const timeLeft = expiryDate - now;
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          
          if (hoursLeft > 24) {
            const daysLeft = Math.floor(hoursLeft / 24);
            expiryInfo = `\n🕒 Your earliest one expires in ${daysLeft} day(s)`;
          } else {
            expiryInfo = `\n🕒 Your earliest one expires in ${hoursLeft} hour(s)`;
          }
        }
      }
      
      // Format item details message
      let response = `📦 𝗜𝗧𝗘𝗠 𝗜𝗡𝗙𝗢: ${item.name}\n\n`;
      response += `📝 Description: ${item.description}\n`;
      response += `💰 Price: ${item.price.toLocaleString()} coins\n`;
      response += `⏳ Duration: ${item.duration}\n`;
      
      // Add effects
      response += `\n✨ Effects:\n`;
      item.effects.forEach(effect => {
        response += `- ${effect}\n`;
      });
      
      // Add usage info
      response += `\n🔧 Usage: ${item.usage}\n`;
      
      // Add stackability info
      response += `📚 Stackable: ${item.stackable ? 'Yes' : 'No'}\n`;
      if (item.stackable) {
        response += `📊 Max Stack: ${item.maxStack}\n`;
      }
      
      // Add giftability info
      response += `🎁 Giftable: ${item.giftable ? 'Yes' : 'No'}\n`;
      
      // Add ownership info
      response += `\n👤 You own: ${ownedCount} ${ownedCount === 1 ? 'copy' : 'copies'}${expiryInfo}\n`;
      
      // Add purchase info
      response += `\n💡 To purchase: ${global.config.prefix}shop buy ${itemId} [quantity]`;
      
      // Send item details message
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in iteminfo command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};