/**
 * Borrow Command
 * Allows users to borrow money from other users
 */

module.exports = {
  config: {
    name: 'borrow',
    aliases: ['loan', 'lend'],
    description: 'Borrow money from another user or lend money to them',
    usage: '{prefix}borrow [@mention] [amount]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Check if enough arguments
      if (args.length < 2 || Object.keys(mentions).length === 0) {
        return api.sendMessage('❌ Please mention a user and specify the amount to borrow/lend.\nUsage: borrow [@mention] [amount]', threadID, messageID);
      }
      
      // Get lender ID from mentions
      const lenderID = Object.keys(mentions)[0];
      
      // Check if user is trying to borrow from themselves
      if (lenderID === senderID) {
        return api.sendMessage('❌ You cannot borrow money from yourself.', threadID, messageID);
      }
      
      // Get lender name
      const lenderName = mentions[lenderID].replace('@', '');
      
      // Get amount from args (last argument)
      const amount = parseInt(args[args.length - 1]);
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return api.sendMessage('❌ Please provide a valid positive number for the amount.', threadID, messageID);
      }
      
      // Get borrower (sender) data
      let borrowerCurrency = await global.Currency.findOne({ userID: senderID });
      if (!borrowerCurrency) {
        borrowerCurrency = await global.Currency.create({ userID: senderID });
      }
      
      // Get borrower name
      const borrower = await global.User.findOne({ userID: senderID });
      const borrowerName = borrower ? borrower.name : 'User';
      
      // Get lender data
      let lenderCurrency = await global.Currency.findOne({ userID: lenderID });
      if (!lenderCurrency) {
        lenderCurrency = await global.Currency.create({ userID: lenderID });
      }
      
      // Check if lender has enough money
      if (amount > lenderCurrency.money) {
        return api.sendMessage(`❌ ${lenderName} doesn't have enough money to lend you. They only have ${lenderCurrency.money} coins.`, threadID, messageID);
      }
      
      // Send loan request message
      api.sendMessage(
        {
          body: `💰 𝗟𝗢𝗔𝗡 𝗥𝗘𝗤𝗨𝗘𝗦𝗧

` +
                `👤 @${borrowerName} wants to borrow ${amount} coins from @${lenderName}.

` +
                `@${lenderName}, please react with:
` +
                `👍 to approve the loan
` +
                `👎 to decline the loan`,
          mentions: [
            { tag: `@${borrowerName}`, id: senderID },
            { tag: `@${lenderName}`, id: lenderID }
          ]
        },
        threadID,
        async (err, info) => {
          if (err) {
            global.logger.error(`Error sending loan request: ${err.message}`);
            return api.sendMessage('❌ An error occurred while sending the loan request.', threadID, messageID);
          }
          
          global.logger.debug(`Loan request message sent with ID: ${info.messageID}`);
          
          // Store the loan request in global client reactions
          if (!global.client.loanRequests) global.client.loanRequests = new Map();
          
          // Convert messageID to string for consistent comparison later
          const messageIDStr = String(info.messageID);
          
          const loanData = {
            borrowerID: String(senderID).trim(),
            borrowerName: borrowerName,
            lenderID: String(lenderID).trim(),
            lenderName: lenderName,
            amount: amount,
            timestamp: Date.now(),
            threadID: threadID,
            messageID: messageIDStr // Store the messageID as string for easier debugging and comparison
          };
          
          global.logger.debug(`Storing loan data with trimmed IDs - Borrower: '${loanData.borrowerID}', Lender: '${loanData.lenderID}'`);
          
          global.client.loanRequests.set(messageIDStr, loanData);
          global.logger.debug(`Loan request stored with key type: ${typeof messageIDStr}`);
          global.logger.debug(`Map key check - has exact key: ${global.client.loanRequests.has(messageIDStr)}`);
          global.logger.debug(`Map key check - has original key: ${global.client.loanRequests.has(info.messageID)}`);
          global.logger.debug(`Original messageID type: ${typeof info.messageID}`);
          global.logger.debug(`Stored messageID type: ${typeof messageIDStr}`);
          
          // Debug logging
          global.logger.debug(`Created loan request with messageID: ${info.messageID}`);
          global.logger.debug(`Loan request details: ${JSON.stringify(loanData)}`);
          global.logger.debug(`Current loan requests: ${global.client.loanRequests.size}`);
          global.logger.debug(`Borrower ID: ${senderID}, Lender ID: ${lenderID}`);
          global.logger.debug(`Mentions object: ${JSON.stringify(mentions)}`);
          global.logger.debug(`First mention key: ${Object.keys(mentions)[0]}`);
          
          if (global.config.debug) {
            global.logger.debug('All active loan requests:');
            for (const [msgID, loan] of global.client.loanRequests.entries()) {
              global.logger.debug(`- MessageID: ${msgID}, Borrower: ${loan.borrowerName}, Lender: ${loan.lenderName}, Amount: ${loan.amount}`);
            }
          }
          
          // Reaction handling is now done in handleReaction.js
        }
      );
      
      // Send confirmation to borrower
      return api.sendMessage(
        `✅ Your loan request for ${amount} coins has been sent to ${lenderName}. Please wait for their response.`,
        threadID, messageID
      );
      
    } catch (error) {
      global.logger.error('Error in borrow command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};

// Loan reaction handling is now done in handleReaction.js