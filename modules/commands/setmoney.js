/**
 * SetMoney Command
 * Allows admins to set money for users
 */

module.exports = {
  config: {
    name: 'setmoney',
    aliases: ['setcash', 'setbalance'],
    description: 'Set money for a user',
    usage: '{prefix}setmoney [@mention/uid] [amount] or {prefix}setmoney [amount] (for self)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN',  // Only admins can use this command
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
      // Check if user has permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
      if (!hasPermission) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      let targetID, targetName, amount;
      
      // Case 1: Setting money for self
      if (args.length === 1 && !isNaN(args[0])) {
        targetID = senderID;
        targetName = 'yourself';
        amount = parseInt(args[0]);
      }
      // Case 2: Setting money for mentioned user
      else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        targetName = mentions[targetID].replace('@', '');
        amount = parseInt(args[args.length - 1]);
      }
      // Case 3: Setting money using UID
      else if (args.length >= 2 && !isNaN(args[0]) && args[0].length >= 10) {
        targetID = args[0];
        targetName = 'user with ID ' + targetID;
        amount = parseInt(args[1]);
      }
      // Invalid usage
      else {
        return api.sendMessage(
          '❌ Invalid usage. Please use one of these formats:\n' +
          '1. {prefix}setmoney [amount] (to set your own money)\n' +
          '2. {prefix}setmoney [@mention] [amount] (to set money for mentioned user)\n' +
          '3. {prefix}setmoney [uid] [amount] (to set money using user ID)',
          threadID, messageID
        );
      }
      
      // Validate amount
      if (isNaN(amount) || amount < 0) {
        return api.sendMessage('❌ Please provide a valid positive number for money amount.', threadID, messageID);
      }
      
      // Get currency data
      let currency = await global.Currency.findOne({ userID: targetID });
      
      // Create if not exists
      if (!currency) {
        currency = await global.Currency.create({ userID: targetID });
      }
      
      // Set money
      currency.money = amount;
      
      // Save changes
      await currency.save();
      
      // Send confirmation message
      return api.sendMessage(
        `✅ Set ${amount} money for ${targetName}.`,
        threadID, messageID
      );
    } catch (error) {
      global.logger.error('Error in setmoney command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};