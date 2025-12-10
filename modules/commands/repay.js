/**
 * Repay Command
 * Allows users to repay borrowed money to other users
 */

module.exports = {
  config: {
    name: 'repay',
    aliases: ['payback'],
    description: 'Repay borrowed money to another user',
    usage: '{prefix}repay @user [amount]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
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
      // Check if user mentioned someone
      if (Object.keys(mentions).length === 0) {
        return api.sendMessage("❌ You must mention the user you want to repay.", threadID, messageID);
      }
      
      // Get the first mentioned user
      const otherUserID = Object.keys(mentions)[0];
      
      // Cannot repay yourself
      if (otherUserID === senderID) {
        return api.sendMessage("❌ You cannot repay yourself.", threadID, messageID);
      }
      
      // Get amount from args - use the last argument
      const amountStr = args[args.length - 1];
      if (!amountStr || amountStr.includes('@')) {
        return api.sendMessage("❌ You must specify an amount to repay.", threadID, messageID);
      }
      
      // Parse amount
      const amount = parseInt(amountStr);
      
      // Separate checks for better error messages
      if (isNaN(amount)) {
        return api.sendMessage("❌ Amount must be a valid number.", threadID, messageID);
      }
      
      if (amount <= 0) {
        return api.sendMessage("❌ Amount must be a positive number.", threadID, messageID);
      }
      
      // Get sender's currency data
      let senderCurrency = await global.Currency.findOne({ userID: senderID });
      if (!senderCurrency) {
        return api.sendMessage('❌ Your currency data not found.', threadID, messageID);
      }
      
      // Check if sender has enough money
      if (senderCurrency.money < amount) {
        return api.sendMessage(
          `❌ You don't have enough money to repay ${amount} coins. You only have ${senderCurrency.money} coins.`,
          threadID,
          messageID
        );
      }
      
      // Get receiver's currency data
      let receiverCurrency = await global.Currency.findOne({ userID: otherUserID });
      if (!receiverCurrency) {
        return api.sendMessage('❌ Recipient currency data not found.', threadID, messageID);
      }
      
      // Get user names
      const sender = await global.User.findOne({ userID: senderID });
      const receiver = await global.User.findOne({ userID: otherUserID });
      
      if (!sender || !receiver) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Transfer money
      senderCurrency.money -= amount;
      receiverCurrency.money += amount;
      
      // Save changes
      await senderCurrency.save();
      await receiverCurrency.save();
      
      // Send confirmation messages
      api.sendMessage(
        `✅ You repaid ${amount} coins to ${receiver.name}.\n` +
        `💵 Your remaining balance: ${senderCurrency.money} coins`,
        threadID,
        messageID
      );
      
      api.sendMessage(
        {
          body: `💰 𝗥𝗘𝗣𝗔𝗬𝗠𝗘𝗡𝗧 𝗥𝗘𝗖𝗘𝗜𝗩𝗘𝗗\n\n` +
                `✅ @${sender.name} has repaid you ${amount} coins.\n` +
                `💵 Your new balance: ${receiverCurrency.money} coins`,
          mentions: [{ tag: `@${sender.name}`, id: senderID }]
        },
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error in repay command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};