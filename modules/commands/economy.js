/**
 * Economy Command
 * Shows information about the economy system
 */

module.exports = {
  config: {
    name: 'economy',
    aliases: ['eco', 'economyhelp', 'moneyhelp'],
    description: 'Shows information about the economy system',
    usage: '{prefix}economy',
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
    const { threadID, messageID } = message;
    const prefix = global.config.prefix;
    
    try {
      const economyInfo = `💰 𝗘𝗖𝗢𝗡𝗢𝗠𝗬 𝗦𝗬𝗦𝗧𝗘𝗠 𝗜𝗡𝗙𝗢 💰\n\n` +
                        `Welcome to the bot's economy system! Here's how it works:\n\n` +
                        
                        `📊 𝗟𝗘𝗩𝗘𝗟𝗜𝗡𝗚 𝗦𝗬𝗦𝗧𝗘𝗠:
` +
                        `• You gain EXP by sending messages in the chat
` +
                        `• Level requirements:
` +
                        `  - Level 1 to 2: 40 XP
` +
                        `  - Level 2 to 3: 60 XP
` +
                        `  - Level 3 to 4: 80 XP
` +
                        `  - Level 4+: level × 20 XP
` +
                        `• When you level up, you get bonus money and increased bank capacity\n` +
                        `• Use ${prefix}rank to check your level and EXP\n` +
                        `• Use ${prefix}top level to see the leaderboard\n\n` +
                        
                        `💵 𝗠𝗢𝗡𝗘𝗬 𝗦𝗬𝗦𝗧𝗘𝗠:\n` +
                        `• You earn money by sending messages, using ${prefix}daily, and ${prefix}work\n` +
                        `• You can store money in your bank to keep it safe from robberies\n` +
                        `• Bank capacity increases with your level\n` +
                        `• Use ${prefix}balance to check your money\n` +
                        `• Use ${prefix}top money to see the richest users\n\n` +
                        
                        `🏦 𝗕𝗔𝗡𝗞 𝗖𝗔𝗣𝗔𝗖𝗜𝗧𝗬:\n` +
                        `• Level 1: 5,000 coins\n` +
                        `• Level 2: 7,000 coins\n` +
                        `• Level 3: 10,000 coins\n` +
                        `• Level 4: 15,000 coins\n` +
                        `• Level 5+: 15,000 + (5,000 × (level - 4)) coins\n\n` +
                        
                        `🎮 𝗔𝗩𝗔𝗜𝗟𝗔𝗕𝗟𝗘 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:\n` +
                        `• ${prefix}daily - Claim daily reward\n` +
                        `• ${prefix}work - Work to earn money (1 hour cooldown)\n` +
                        `• ${prefix}balance - Check your balance\n` +
                        `• ${prefix}bank - Manage your bank account\n` +
                        `• ${prefix}transfer - Transfer money to another user\n` +
                        `• ${prefix}borrow - Borrow money from another user\n` +
                        `• ${prefix}repay - Repay borrowed money\n` +
                        `• ${prefix}gamble - Gamble your money\n` +
                        `• ${prefix}rob - Attempt to rob another user\n` +
                        `• ${prefix}shop - Buy items with your money\n` +
                        `• ${prefix}rank - Check your level and EXP\n` +
                        `• ${prefix}top - View leaderboards\n\n` +
                        
                        `👑 𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:\n` +
                        `• ${prefix}setexp - Set a user's experience points\n` +
                        `• ${prefix}give - Give money to a user\n` +
                        `• ${prefix}resetcurrency - Reset currency data\n\n` +
                        
                        `Have fun with the economy system! 🎉`;
      
      return api.sendMessage(economyInfo, threadID, messageID);
    } catch (error) {
      global.logger.error('Error in economy command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};