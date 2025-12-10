/**
 * Inventory Command
 * Shows a user's purchased items
 */

module.exports = {
  config: {
    name: 'inventory',
    aliases: ['inv', 'items', 'backpack'],
    description: 'Check your inventory of purchased items',
    usage: '{prefix}inventory',
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Determine whose inventory to check
      let targetID = senderID;
      let isOwnInventory = true;
      
      // If user mentioned someone, check their inventory instead
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        isOwnInventory = false;
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      if (!currency) {
        return api.sendMessage('❌ Currency data not found.', threadID, messageID);
      }
      
      // Check if user has inventory field, if not, create it
      if (!currency.inventory) {
        currency.inventory = [];
        await currency.save();
      }
      
      // Format inventory message
      const title = isOwnInventory ? '𝗬𝗢𝗨𝗥 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬' : `${user.name.toUpperCase()}'𝗦 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬`;
      
      let response = `🎒 ${title} 🎒\n\n`;
      
      // Check if inventory is empty
      if (currency.inventory.length === 0) {
        response += `${isOwnInventory ? 'You don\'t' : `${user.name} doesn\'t`} have any items yet.\n`;
        response += `\n💡 Use ${global.config.prefix}shop to buy items.`;
      } else {
        // Group items by type and count quantities
        const itemCounts = {};
        
        currency.inventory.forEach(item => {
          if (itemCounts[item.id]) {
            itemCounts[item.id].quantity++;
          } else {
            itemCounts[item.id] = {
              name: item.name,
              description: item.description,
              quantity: 1,
              expiry: item.expiry
            };
          }
        });
        
        // Add items to response
        Object.keys(itemCounts).forEach(itemId => {
          const item = itemCounts[itemId];
          response += `📦 ${item.name} (×${item.quantity})\n`;
          response += `   ${item.description}\n`;
          
          // Add expiry date if applicable
          if (item.expiry) {
            const expiryDate = new Date(item.expiry);
            const now = new Date();
            
            if (expiryDate > now) {
              // Calculate time remaining
              const timeRemaining = expiryDate - now;
              const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
              
              if (hoursRemaining > 24) {
                const daysRemaining = Math.floor(hoursRemaining / 24);
                response += `   ⏳ Expires in ${daysRemaining} day(s)\n`;
              } else {
                response += `   ⏳ Expires in ${hoursRemaining} hour(s)\n`;
              }
            } else {
              response += `   ⌛ Expired\n`;
            }
          }
          
          response += `\n`;
        });
      }
      
      // Send inventory message
      return api.sendMessage(
        {
          body: response,
          mentions: isOwnInventory ? [] : [{ tag: user.name, id: targetID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in inventory command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};