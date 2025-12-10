/**
 * Give Command
 * Allows admins to give money to users
 */

module.exports = {
  config: {
    name: 'give',
    aliases: ['award', 'grant'],
    description: 'Give money to a user (Admin only)',
    usage: '{prefix}give @user [amount]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'ADMIN', // Admin only command
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
      // Check if user mentioned someone
      if (Object.keys(mentions).length === 0) {
        return api.sendMessage('❌ You must mention a user to give money to.', threadID, messageID);
      }
      
      // Get the mentioned user ID (first mention)
      const receiverID = Object.keys(mentions)[0];
      
      // Get amount from args - find the last argument that's a number
      const amountStr = args[args.length - 1];
      if (!amountStr || amountStr.includes('@')) {
        return api.sendMessage('❌ You must specify an amount to give.', threadID, messageID);
      }
      
      // Parse amount - ensure it's a valid positive number
      const amount = parseInt(amountStr);
      
      // Separate checks for better error messages
      if (isNaN(amount)) {
        return api.sendMessage('❌ Amount must be a valid number.', threadID, messageID);
      }
      
      if (amount <= 0) {
        return api.sendMessage('❌ Amount must be a positive number.', threadID, messageID);
      }
      
      // Get receiver's currency data
      let receiverCurrency = await global.Currency.findOne({ userID: receiverID });
      if (!receiverCurrency) {
        // Create new currency data if not found
        receiverCurrency = new global.Currency({
          userID: receiverID,
          exp: 0,
          level: 1,
          money: 0,
          bank: 0,
          bankCapacity: 5000,
          daily: null,
          lastUpdated: new Date()
        });
      }
      
      // Get user names
      const admin = await global.User.findOne({ userID: senderID });
      const receiver = await global.User.findOne({ userID: receiverID });
      
      if (!admin || !receiver) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Add money to receiver
      receiverCurrency.money += amount;
      
      // Save changes
      await receiverCurrency.save();
      
      // Send confirmation messages
      api.sendMessage(
        {
          body: `💰 𝗠𝗢𝗡𝗘𝗬 𝗚𝗜𝗩𝗘𝗡\n\n` +
                `✅ Admin @${admin.name} has given ${amount} coins to @${receiver.name}.\n` +
                `💵 ${receiver.name}'s new balance: ${receiverCurrency.money} coins`,
          mentions: [
            { tag: `@${admin.name}`, id: senderID },
            { tag: `@${receiver.name}`, id: receiverID }
          ]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in give command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};