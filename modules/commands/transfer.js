/**
 * Transfer Command
 * Allows users to transfer money to other users
 */

module.exports = {
  config: {
    name: 'transfer',
    aliases: ['send', 'pay'],
    description: 'Transfer money to another user',
    usage: '{prefix}transfer [@mention] [amount]',
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
      // Check if enough arguments
      if (args.length < 2 || Object.keys(mentions).length === 0) {
        return api.sendMessage('❌ Please mention a user and specify the amount to transfer.\nUsage: transfer [@mention] [amount]', threadID, messageID);
      }
      
      // Get recipient ID from mentions
      const recipientID = Object.keys(mentions)[0];
      
      // Check if user is trying to transfer to themselves
      if (recipientID === senderID) {
        return api.sendMessage('❌ You cannot transfer money to yourself.', threadID, messageID);
      }
      
      // Get recipient name
      const recipientName = mentions[recipientID].replace('@', '');
      
      // Get amount from args (last argument)
      const amount = parseInt(args[args.length - 1]);
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return api.sendMessage('❌ Please provide a valid positive number for the transfer amount.', threadID, messageID);
      }
      
      // Get sender currency data
      let senderCurrency = await global.Currency.findOne({ userID: senderID });
      
      // Check if sender exists
      if (!senderCurrency) {
        senderCurrency = await global.Currency.create({ userID: senderID });
      }
      
      // Check if sender has enough money
      if (amount > senderCurrency.money) {
        return api.sendMessage(`❌ You don't have enough money. You only have ${senderCurrency.money} coins in your wallet.`, threadID, messageID);
      }
      
      // Get recipient currency data
      let recipientCurrency = await global.Currency.findOne({ userID: recipientID });
      
      // Create recipient currency if not exists
      if (!recipientCurrency) {
        recipientCurrency = await global.Currency.create({ userID: recipientID });
      }
      
      // Apply transfer fee (5%)
      const fee = Math.floor(amount * 0.05);
      const transferAmount = amount - fee;
      
      // Update sender currency
      senderCurrency.money -= amount;
      await senderCurrency.save();
      
      // Update recipient currency
      recipientCurrency.money += transferAmount;
      await recipientCurrency.save();
      
      // Get sender name
      const sender = await global.User.findOne({ userID: senderID });
      const senderName = sender ? sender.name : 'User';
      
      // Send confirmation message to sender
      api.sendMessage(
        `💸 𝗧𝗥𝗔𝗡𝗦𝗙𝗘𝗥 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟

` +
        `✅ You transferred ${transferAmount} coins to ${recipientName}.
` +
        `💰 Transfer fee: ${fee} coins (5%)
` +
        `💵 Your remaining balance: ${senderCurrency.money} coins`,
        threadID, messageID
      );
      
      // Send notification to recipient
      api.sendMessage(
        {
          body: `💰 𝗠𝗢𝗡𝗘𝗬 𝗥𝗘𝗖𝗘𝗜𝗩𝗘𝗗

` +
                `✅ You received ${transferAmount} coins from ${senderName}.
` +
                `💵 Your new balance: ${recipientCurrency.money} coins`,
          mentions: [{ tag: `@${recipientName}`, id: recipientID }]
        },
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error in transfer command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};