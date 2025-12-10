/**
 * Reset Currency Command
 * Allows admins to reset currency data for a user or all users
 */

module.exports = {
  config: {
    name: 'resetcurrency',
    aliases: ['resetmoney', 'reseteconomy'],
    description: 'Reset currency data for a user or all users (Admin only)',
    usage: '{prefix}resetcurrency [@user/all] [confirm]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN', // Admin only command
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
      // Check if target is specified
      if (args.length === 0) {
        return api.sendMessage(
          '❌ You must specify a target (@user or "all") to reset currency data.\n' +
          `Usage: ${global.config.prefix}resetcurrency [@user/all] [confirm]`,
          threadID,
          messageID
        );
      }
      
      // Check if confirmation is provided
      const isConfirmed = args.some(arg => arg.toLowerCase() === 'confirm');
      if (!isConfirmed) {
        return api.sendMessage(
          '⚠️ This action will reset currency data and cannot be undone!\n' +
          'Add "confirm" to your command to proceed.',
          threadID,
          messageID
        );
      }
      
      // Get admin name
      const admin = await global.User.findOne({ userID: senderID });
      if (!admin) {
        return api.sendMessage('❌ Admin data not found.', threadID, messageID);
      }
      
      // Reset for all users
      if (args[0].toLowerCase() === 'all') {
        // Default values for reset
        const defaultValues = {
          exp: 0,
          level: 1,
          money: 100, // Starting money (reduced to 100 for balance)
          bank: 0,
          bankCapacity: 5000,
          daily: null,
          inventory: [], // Reset inventory
          lastUpdated: new Date()
        };
        
        // Update all currency records
        const result = await global.Currency.updateMany(
          {}, // Match all documents
          { $set: defaultValues }
        );
        
        return api.sendMessage(
          {
            body: `🔄 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗥𝗘𝗦𝗘𝗧\n\n` +
                  `✅ Admin @${admin.name} has reset currency data for all users.\n` +
                  `📊 ${result.modifiedCount} user records were updated.\n\n` +
                  `💰 Default values:
` +
                  `- Money: 100 coins
` +
                  `- Bank: 0 coins
` +
                  `- Level: 1
` +
                  `- EXP: 0
` +
                  `- Bank Capacity: 5000 coins
` +
                  `- Inventory: Empty`,
            mentions: [{ tag: `@${admin.name}`, id: senderID }]
          },
          threadID,
          messageID
        );
      }
      // Reset for specific user
      else if (Object.keys(mentions).length > 0) {
        const targetID = Object.keys(mentions)[0];
        
        // Get target user
        const targetUser = await global.User.findOne({ userID: targetID });
        if (!targetUser) {
          return api.sendMessage('❌ Target user data not found.', threadID, messageID);
        }
        
        // Default values for reset
        const defaultValues = {
          exp: 0,
          level: 1,
          money: 100, // Starting money (reduced to 100 for balance)
          bank: 0,
          bankCapacity: 5000,
          daily: null,
          inventory: [], // Reset inventory
          lastUpdated: new Date()
        };
        
        // Find and update user's currency data
        let targetCurrency = await global.Currency.findOne({ userID: targetID });
        
        if (!targetCurrency) {
          // Create new currency data if not found
          targetCurrency = new global.Currency({
            userID: targetID,
            ...defaultValues
          });
        } else {
          // Update existing currency data
          Object.assign(targetCurrency, defaultValues);
        }
        
        // Save changes
        await targetCurrency.save();
        
        return api.sendMessage(
          {
            body: `🔄 𝗖𝗨𝗥𝗥𝗘𝗡𝗖𝗬 𝗥𝗘𝗦𝗘𝗧\n\n` +
                  `✅ Admin @${admin.name} has reset currency data for @${targetUser.name}.\n\n` +
                  `💰 New values:
` +
                  `- Money: 100 coins
` +
                  `- Bank: 0 coins
` +
                  `- Level: 1
` +
                  `- EXP: 0
` +
                  `- Bank Capacity: 5000 coins
` +
                  `- Inventory: Empty`,
            mentions: [
              { tag: `@${admin.name}`, id: senderID },
              { tag: `@${targetUser.name}`, id: targetID }
            ]
          },
          threadID,
          messageID
        );
      }
      // Invalid target
      else {
        return api.sendMessage(
          '❌ Invalid target. You must mention a user or use "all" to reset everyone\'s currency data.',
          threadID,
          messageID
        );
      }
      
    } catch (error) {
      global.logger.error('Error in resetcurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};