/**
 * Gift Item Command
 * Allows users to gift items from their inventory to other users
 */

module.exports = {
  config: {
    name: 'giftitem',
    aliases: ['gift', 'giveitem'],
    description: 'Gift an item from your inventory to another user',
    usage: '{prefix}giftitem [item_id] [@user]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
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
      // Check if item ID and recipient are provided
      if (args.length < 1) {
        return api.sendMessage(
          '❌ You must specify an item to gift and a recipient.\n' +
          `Usage: ${global.config.prefix}giftitem [item_id] [@user]\n\n` +
          `💡 Use ${global.config.prefix}inventory to see your items.`,
          threadID,
          messageID
        );
      }
      
      // Get item ID from args
      const itemId = args[0].toLowerCase();
      
      // Check if recipient is mentioned
      if (Object.keys(mentions).length === 0) {
        return api.sendMessage(
          '❌ You must mention a user to gift the item to.\n' +
          `Usage: ${global.config.prefix}giftitem [item_id] [@user]`,
          threadID,
          messageID
        );
      }
      
      // Get recipient ID
      const recipientID = Object.keys(mentions)[0];
      
      // Check if user is trying to gift to themselves
      if (recipientID === senderID) {
        return api.sendMessage(
          '❌ You cannot gift items to yourself.',
          threadID,
          messageID
        );
      }
      
      // Get sender data
      const sender = await global.User.findOne({ userID: senderID });
      if (!sender) {
        return api.sendMessage('❌ Your user data was not found.', threadID, messageID);
      }
      
      // Get recipient data
      const recipient = await global.User.findOne({ userID: recipientID });
      if (!recipient) {
        return api.sendMessage('❌ Recipient user data was not found.', threadID, messageID);
      }
      
      // Get sender's currency data
      const senderCurrency = await global.Currency.findOne({ userID: senderID });
      if (!senderCurrency) {
        return api.sendMessage('❌ Your currency data was not found.', threadID, messageID);
      }
      
      // Check if sender has inventory
      if (!senderCurrency.inventory || !Array.isArray(senderCurrency.inventory) || senderCurrency.inventory.length === 0) {
        return api.sendMessage(
          '❌ You don\'t have any items in your inventory.\n' +
          `💡 Use ${global.config.prefix}shop to buy items.`,
          threadID,
          messageID
        );
      }
      
      // Find the item in sender's inventory
      const itemIndex = senderCurrency.inventory.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return api.sendMessage(
          `❌ You don't have any ${itemId} in your inventory.\n` +
          `💡 Use ${global.config.prefix}inventory to see your items.`,
          threadID,
          messageID
        );
      }
      
      // Check if item is expired
      const item = senderCurrency.inventory[itemIndex];
      if (item.expiry && new Date(item.expiry) < new Date()) {
        // Remove expired item
        senderCurrency.inventory.splice(itemIndex, 1);
        await senderCurrency.save();
        
        return api.sendMessage(
          `❌ This ${item.name} has expired and has been removed from your inventory.`,
          threadID,
          messageID
        );
      }
      
      // Check if item is giftable
      const nonGiftableItems = ['vip', 'bankupgrade'];
      if (nonGiftableItems.includes(item.id)) {
        return api.sendMessage(
          `❌ The ${item.name} cannot be gifted to other users.`,
          threadID,
          messageID
        );
      }
      
      // Get recipient's currency data
      let recipientCurrency = await global.Currency.findOne({ userID: recipientID });
      
      // Create recipient's currency data if it doesn't exist
      if (!recipientCurrency) {
        recipientCurrency = await global.Currency.create({
          userID: recipientID,
          exp: 0,
          level: 1,
          money: 100,
          bank: 0,
          bankCapacity: 5000,
          inventory: [],
          lastUpdated: new Date()
        });
      }
      
      // Initialize recipient's inventory if it doesn't exist
      if (!recipientCurrency.inventory) {
        recipientCurrency.inventory = [];
      }
      
      // Remove item from sender's inventory
      const giftedItem = senderCurrency.inventory.splice(itemIndex, 1)[0];
      
      // Calculate remaining time for time-limited items
      let timeRemaining = '';
      if (giftedItem.expiry) {
        const expiryDate = new Date(giftedItem.expiry);
        const now = new Date();
        
        if (expiryDate > now) {
          const timeLeft = expiryDate - now;
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          
          if (hoursLeft > 24) {
            const daysLeft = Math.floor(hoursLeft / 24);
            timeRemaining = `(${daysLeft} days remaining)`;
          } else {
            timeRemaining = `(${hoursLeft} hours remaining)`;
          }
        }
      }
      
      // Add item to recipient's inventory
      recipientCurrency.inventory.push(giftedItem);
      
      // Save changes
      await senderCurrency.save();
      await recipientCurrency.save();
      
      // Send confirmation message
      return api.sendMessage(
        {
          body: `🎁 𝗚𝗜𝗙𝗧 𝗦𝗘𝗡𝗧\n\n` +
                `👤 @${sender.name} has gifted:\n` +
                `📦 ${giftedItem.name} ${timeRemaining}\n` +
                `👥 To: @${recipient.name}\n\n` +
                `💝 Enjoy your gift!`,
          mentions: [
            { tag: `@${sender.name}`, id: senderID },
            { tag: `@${recipient.name}`, id: recipientID }
          ]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in giftitem command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};