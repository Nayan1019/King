/**
 * Database Stats Command
 * Shows statistics about the database
 */

module.exports = {
  config: {
    name: 'dbstats',
    aliases: ['dbinfo', 'stats'],
    description: 'Show database statistics',
    usage: '{prefix}dbstats',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN', // Only admins can use this command
    cooldown: 30,
    category: 'SYSTEM'
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
      api.sendMessage('🔄 Gathering database statistics...', threadID, messageID);
      
      // Get counts from each collection
      const userCount = await global.User.countDocuments({});
      const threadCount = await global.Thread.countDocuments({});
      const currencyCount = await global.Currency.countDocuments({});
      
      // Calculate missing records
      const missingCurrency = userCount - currencyCount;
      
      // Get top 5 richest users
      const richestUsers = await global.Currency.find({}).sort({ money: -1 }).limit(5);
      
      // Format richest users list
      let richestList = '';
      for (let i = 0; i < richestUsers.length; i++) {
        const currency = richestUsers[i];
        const user = await global.User.findOne({ userID: currency.userID });
        const name = user ? user.name : 'Unknown User';
        richestList += `${i+1}. ${name}: ${currency.money.toLocaleString()} coins\n`;
      }
      
      // Get top 5 highest level users
      const highestLevelUsers = await global.Currency.find({}).sort({ level: -1 }).limit(5);
      
      // Format highest level users list
      let levelList = '';
      for (let i = 0; i < highestLevelUsers.length; i++) {
        const currency = highestLevelUsers[i];
        const user = await global.User.findOne({ userID: currency.userID });
        const name = user ? user.name : 'Unknown User';
        levelList += `${i+1}. ${name}: Level ${currency.level} (${currency.exp.toLocaleString()} EXP)\n`;
      }
      
      // Send stats message
      return api.sendMessage(
        `📊 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦 📊\n\n` +
        `👥 Users: ${userCount}\n` +
        `💬 Threads: ${threadCount}\n` +
        `💰 Currency Records: ${currencyCount}\n` +
        `⚠️ Missing Currency Records: ${missingCurrency}\n\n` +
        `💵 𝗧𝗢𝗣 𝟱 𝗥𝗜𝗖𝗛𝗘𝗦𝗧 𝗨𝗦𝗘𝗥𝗦:\n${richestList}\n` +
        `⭐ 𝗧𝗢𝗣 𝟱 𝗛𝗜𝗚𝗛𝗘𝗦𝗧 𝗟𝗘𝗩𝗘𝗟𝗦:\n${levelList}\n\n` +
        `Use ${global.config.prefix}fixcurrency to fix missing records.`,
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error in dbstats command:', error.message);
      return api.sendMessage('❌ An error occurred while gathering database statistics.', threadID, messageID);
    }
  }
};