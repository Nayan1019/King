/**
 * Rob Command
 * Allows users to attempt to rob money from other users
 */

module.exports = {
  config: {
    name: 'rob',
    aliases: ['steal'],
    description: 'Attempt to rob money from another user',
    usage: '{prefix}rob @user',
    category: 'ECONOMY',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 3600 // 1 hour cooldown
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
        return api.sendMessage('❌ You must mention a user to rob.', threadID, messageID);
      }
      
      // Get the mentioned user ID (first mention)
      const victimID = Object.keys(mentions)[0];
      
      // Cannot rob yourself
      if (victimID === senderID) {
        return api.sendMessage('❌ You cannot rob yourself.', threadID, messageID);
      }
      
      // Get robber's currency data
      let robberCurrency = await global.Currency.findOne({ userID: senderID });
      if (!robberCurrency) {
        return api.sendMessage('❌ Your currency data not found.', threadID, messageID);
      }
      
      // Check if robber has minimum money to attempt a robbery
      const minMoneyToRob = 500;
      if (robberCurrency.money < minMoneyToRob) {
        return api.sendMessage(
          `❌ You need at least ${minMoneyToRob} coins to attempt a robbery. You only have ${robberCurrency.money} coins.`,
          threadID,
          messageID
        );
      }
      
      // Get victim's currency data
      let victimCurrency = await global.Currency.findOne({ userID: victimID });
      if (!victimCurrency) {
        return api.sendMessage('❌ Victim currency data not found.', threadID, messageID);
      }
      
      // Check if victim has money to steal
      if (victimCurrency.money < 100) {
        return api.sendMessage(
          '❌ This user doesn\'t have enough money to rob. Find a richer target!',
          threadID,
          messageID
        );
      }
      
      // Get user names
      const robber = await global.User.findOne({ userID: senderID });
      const victim = await global.User.findOne({ userID: victimID });
      
      if (!robber || !victim) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Calculate success chance based on levels
      // Higher level robbers have better chance, higher level victims are harder to rob
      let successChance = 30 + (robberCurrency.level * 2) - (victimCurrency.level * 1.5);
      
      // Cap success chance between 10% and 70%
      successChance = Math.max(10, Math.min(70, successChance));
      
      // Generate random number to determine success
      const roll = Math.random() * 100;
      
      // Prepare response message
      let resultMessage = '';
      
      // Success
      if (roll <= successChance) {
        // Calculate amount to steal (10-30% of victim's money)
        const stealPercentage = 10 + Math.floor(Math.random() * 21); // 10-30%
        const stealAmount = Math.floor(victimCurrency.money * (stealPercentage / 100));
        
        // Transfer money
        victimCurrency.money -= stealAmount;
        robberCurrency.money += stealAmount;
        
        // Save changes
        await victimCurrency.save();
        await robberCurrency.save();
        
        resultMessage = `🔫 𝗥𝗢𝗕𝗕𝗘𝗥𝗬 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟\n\n` +
                        `👤 @${robber.name} successfully robbed @${victim.name}!\n` +
                        `💰 Stolen amount: ${stealAmount} coins (${stealPercentage}% of their money)\n` +
                        `💵 Your new balance: ${robberCurrency.money} coins\n\n` +
                        `🎲 Success chance: ${Math.floor(successChance)}%\n` +
                        `🎯 Roll: ${Math.floor(roll)}%`;
      }
      // Failure
      else {
        // Calculate fine (20-40% of robber's money)
        const finePercentage = 20 + Math.floor(Math.random() * 21); // 20-40%
        const fineAmount = Math.floor(robberCurrency.money * (finePercentage / 100));
        
        // Deduct fine from robber
        robberCurrency.money -= fineAmount;
        
        // Save changes
        await robberCurrency.save();
        
        resultMessage = `🚨 𝗥𝗢𝗕𝗕𝗘𝗥𝗬 𝗙𝗔𝗜𝗟𝗘𝗗\n\n` +
                        `👤 @${robber.name} failed to rob @${victim.name}!\n` +
                        `💸 You were caught and fined ${fineAmount} coins (${finePercentage}% of your money)\n` +
                        `💵 Your new balance: ${robberCurrency.money} coins\n\n` +
                        `🎲 Success chance: ${Math.floor(successChance)}%\n` +
                        `🎯 Roll: ${Math.floor(roll)}%`;
      }
      
      // Send result message
      return api.sendMessage(
        {
          body: resultMessage,
          mentions: [
            { tag: `@${robber.name}`, id: senderID },
            { tag: `@${victim.name}`, id: victimID }
          ]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in rob command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};