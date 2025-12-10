/**
 * Fix Currency Command
 * Admin command to fix missing currency records
 */

module.exports = {
  config: {
    name: 'fixcurrency',
    aliases: ['fixdb', 'repairdb'],
    description: 'Fix missing currency records in the database',
    usage: '{prefix}fixcurrency',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN', // Only admins can use this command
    cooldown: 60 // Long cooldown to prevent abuse
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
      // Check if user has permission
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      // Send initial message
      api.sendMessage('🔄 Checking for missing currency records...', threadID, messageID);
      
      // Get all users
      const users = await global.User.find({});
      
      if (!users || users.length === 0) {
        return api.sendMessage('❌ No users found in the database.', threadID);
      }
      
      let created = 0;
      let existing = 0;
      let errors = 0;
      
      // Process each user
      for (const user of users) {
        try {
          // Check if currency record exists
          const currencyExists = await global.Currency.exists({ userID: user.userID });
          
          if (!currencyExists) {
            // Create new currency record
            await global.Currency.create({
              userID: user.userID,
              exp: 0,
              level: 1,
              money: 100, // Start with 100 coins
              bank: 0,
              bankCapacity: 5000,
              lastUpdated: new Date()
            });
            
            created++;
            global.logger.database(`Created missing currency record for user: ${user.userID} (${user.name})`);
          } else {
            existing++;
          }
        } catch (err) {
          errors++;
          global.logger.error(`Error processing user ${user.userID}:`, err.message);
        }
      }
      
      // Send completion message
      return api.sendMessage(
        `✅ Currency database check complete:\n\n` +
        `👥 Total users checked: ${users.length}\n` +
        `✨ New records created: ${created}\n` +
        `📊 Existing records: ${existing}\n` +
        `❌ Errors: ${errors}`,
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error in fixcurrency command:', error.message);
      return api.sendMessage('❌ An error occurred while fixing currency records.', threadID, messageID);
    }
  }
};