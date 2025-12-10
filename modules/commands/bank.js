/**
 * Bank Command
 * Allows users to manage their bank account
 */

module.exports = {
  config: {
    name: 'bank',
    aliases: ['banking', 'atm'],
    description: 'Manage your bank account - deposit, withdraw, or check balance',
    usage: '{prefix}bank [info/deposit/withdraw/borrow/repay] [amount]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'ECONOMY'
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
      // Get user currency data
      let currency = await global.Currency.findOne({ userID: senderID });
      
      // Create if not exists
      if (!currency) {
        currency = await global.Currency.create({ userID: senderID });
      }
      
      // Get user data for name
      const user = await global.User.findOne({ userID: senderID });
      const userName = user ? user.name : 'User';
      
      // If no arguments, show bank info
      if (!args[0] || args[0].toLowerCase() === 'info') {
        // Calculate interest (future implementation)
        const interest = 0;
        
        // Calculate borrowing limit (50% of bank capacity)
        const borrowLimit = Math.floor(currency.bankCapacity * 0.5);
        
        // Format response
        const response = `🏦 𝗕𝗔𝗡𝗞 𝗔𝗖𝗖𝗢𝗨𝗡𝗧 - ${userName}

` +
                        `💰 Wallet: ${currency.money} coins
` +
                        `🏦 Bank Balance: ${currency.bank}/${currency.bankCapacity} coins
` +
                        `💹 Interest Rate: ${interest}% daily
` +
                        `📊 Level: ${currency.level}
` +
                        `✨ XP: ${currency.exp}
` +
                        `💸 Borrowing Limit: ${borrowLimit} coins

` +
                        `ℹ️ Use '${global.config.prefix}bank deposit [amount]' to deposit money
` +
                        `ℹ️ Use '${global.config.prefix}bank withdraw [amount]' to withdraw money
` +
                        `ℹ️ Use '${global.config.prefix}bank borrow [amount]' to borrow money
` +
                        `ℹ️ Use '${global.config.prefix}bank repay [amount]' to repay borrowed money`;
        
        return api.sendMessage(response, threadID, messageID);
      }
      
      // Handle deposit
      if (args[0].toLowerCase() === 'deposit' || args[0].toLowerCase() === 'd') {
        // Check if amount is specified
        if (!args[1]) {
          return api.sendMessage('❌ Please specify an amount to deposit.', threadID, messageID);
        }
        
        // Parse amount
        let amount;
        if (args[1].toLowerCase() === 'all') {
          amount = currency.money;
        } else {
          amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return api.sendMessage('❌ Please provide a valid positive number.', threadID, messageID);
          }
        }
        
        // Check if user has enough money
        if (amount > currency.money) {
          return api.sendMessage(`❌ You don't have enough money. You only have ${currency.money} coins in your wallet.`, threadID, messageID);
        }
        
        // Check if bank has enough capacity
        if (currency.bank + amount > currency.bankCapacity) {
          return api.sendMessage(`❌ Your bank account can't hold that much. Available space: ${currency.bankCapacity - currency.bank} coins.`, threadID, messageID);
        }
        
        // Update currency
        currency.money -= amount;
        currency.bank += amount;
        await currency.save();
        
        // Send success message
        return api.sendMessage(
          `✅ Successfully deposited ${amount} coins to your bank account.
` +
          `💰 Wallet: ${currency.money} coins
` +
          `🏦 Bank Balance: ${currency.bank}/${currency.bankCapacity} coins`,
          threadID, messageID
        );
      }
      
      // Handle withdraw
      if (args[0].toLowerCase() === 'withdraw' || args[0].toLowerCase() === 'w') {
        // Check if amount is specified
        if (!args[1]) {
          return api.sendMessage('❌ Please specify an amount to withdraw.', threadID, messageID);
        }
        
        // Parse amount
        let amount;
        if (args[1].toLowerCase() === 'all') {
          amount = currency.bank;
        } else {
          amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return api.sendMessage('❌ Please provide a valid positive number.', threadID, messageID);
          }
        }
        
        // Check if bank has enough money
        if (amount > currency.bank) {
          return api.sendMessage(`❌ You don't have enough money in your bank. You only have ${currency.bank} coins in your bank account.`, threadID, messageID);
        }
        
        // Update currency
        currency.money += amount;
        currency.bank -= amount;
        await currency.save();
        
        // Send success message
        return api.sendMessage(
          `✅ Successfully withdrew ${amount} coins from your bank account.
` +
          `💰 Wallet: ${currency.money} coins
` +
          `🏦 Bank Balance: ${currency.bank}/${currency.bankCapacity} coins`,
          threadID, messageID
        );
      }
      
      // Handle borrow (future implementation)
      if (args[0].toLowerCase() === 'borrow' || args[0].toLowerCase() === 'loan') {
        // Calculate borrowing limit (50% of bank capacity)
        const borrowLimit = Math.floor(currency.bankCapacity * 0.5);
        
        // Check if amount is specified
        if (!args[1]) {
          return api.sendMessage(`❌ Please specify an amount to borrow. Your borrowing limit is ${borrowLimit} coins.`, threadID, messageID);
        }
        
        // Parse amount
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return api.sendMessage('❌ Please provide a valid positive number.', threadID, messageID);
        }
        
        // Check if amount is within borrowing limit
        if (amount > borrowLimit) {
          return api.sendMessage(`❌ You can only borrow up to ${borrowLimit} coins based on your level.`, threadID, messageID);
        }
        
        // Update currency
        currency.money += amount;
        // Store borrowed amount as negative bank balance
        currency.bank -= amount;
        await currency.save();
        
        // Send success message
        return api.sendMessage(
          `✅ Successfully borrowed ${amount} coins from the bank.
` +
          `💰 Wallet: ${currency.money} coins
` +
          `🏦 Bank Balance: ${currency.bank}/${currency.bankCapacity} coins
` +
          `⚠️ You must repay this loan with 5% interest.`,
          threadID, messageID
        );
      }
      
      // Handle repay
      if (args[0].toLowerCase() === 'repay' || args[0].toLowerCase() === 'pay') {
        // Check if user has a loan (negative bank balance)
        if (currency.bank >= 0) {
          return api.sendMessage('❌ You don\'t have any loans to repay.', threadID, messageID);
        }
        
        // Check if amount is specified
        if (!args[1]) {
          return api.sendMessage(`❌ Please specify an amount to repay. Your current debt is ${Math.abs(currency.bank)} coins.`, threadID, messageID);
        }
        
        // Parse amount
        let amount;
        if (args[1].toLowerCase() === 'all') {
          amount = Math.min(currency.money, Math.abs(currency.bank));
        } else {
          amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return api.sendMessage('❌ Please provide a valid positive number.', threadID, messageID);
          }
        }
        
        // Check if user has enough money
        if (amount > currency.money) {
          return api.sendMessage(`❌ You don't have enough money. You only have ${currency.money} coins in your wallet.`, threadID, messageID);
        }
        
        // Check if amount is more than debt
        if (amount > Math.abs(currency.bank)) {
          return api.sendMessage(`❌ Your debt is only ${Math.abs(currency.bank)} coins. You can't repay more than you owe.`, threadID, messageID);
        }
        
        // Update currency
        currency.money -= amount;
        currency.bank += amount;
        await currency.save();
        
        // Send success message
        return api.sendMessage(
          `✅ Successfully repaid ${amount} coins of your loan.
` +
          `💰 Wallet: ${currency.money} coins
` +
          `🏦 Bank Balance: ${currency.bank}/${currency.bankCapacity} coins${currency.bank < 0 ? `\n⚠️ Remaining debt: ${Math.abs(currency.bank)} coins` : ''}`,
          threadID, messageID
        );
      }
      
      // If command is not recognized
      return api.sendMessage(
        `❌ Invalid bank command. Available options:\n` +
        `ℹ️ ${global.config.prefix}bank info - View your bank account\n` +
        `ℹ️ ${global.config.prefix}bank deposit [amount] - Deposit money\n` +
        `ℹ️ ${global.config.prefix}bank withdraw [amount] - Withdraw money\n` +
        `ℹ️ ${global.config.prefix}bank borrow [amount] - Borrow money\n` +
        `ℹ️ ${global.config.prefix}bank repay [amount] - Repay borrowed money`,
        threadID, messageID
      );
      
    } catch (error) {
      global.logger.error('Error in bank command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};