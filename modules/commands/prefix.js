/**
 * Prefix Command (No Prefix Required)
 * Responds with bot information when someone types 'prefix'
 */

module.exports = {
  config: {
    name: 'prefix',
    aliases: ['botprefix', 'pfx'],
    description: 'Shows bot prefix and information when someone types "prefix"',
    usage: 'prefix',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: false,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'GENERAL'
  },

  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;

    try {
      // Get user data
      let userData = await global.User.findOne({ userID: senderID });
      const userName = userData?.name || 'User';

      // Get bot information
      const botID = global.client.botID;
      const botName = global.config.botNickname || 'FB Bot';
      const prefix = global.config.prefix;
      const ownerID = global.config.ownerID;

      // Get owner data
      let ownerData = await global.User.findOne({ userID: ownerID });
      const ownerName = ownerData?.name || 'Bot Owner';

      // Count commands
      const totalCommands = global.client.commands.size;
      const uniqueCommands = new Set([...global.client.commands.values()].map(cmd => cmd.config.name)).size;

      // Count threads and users
      const totalThreads = await global.Thread.countDocuments();
      const totalUsers = await global.User.countDocuments();

      // Format the text message
      const messageText = `┏━━━━━━━━━━━━━━━━━━━┓\r
┃      𝗕𝗢𝗧 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡     ┃\r
┗━━━━━━━━━━━━━━━━━━━┛\r
\r
👋 Hi ${userName}!\r
\r
🤖 Bot Name: ${botName}\r
🆔 Bot ID: ${botID}\r
\r
📌 Prefix: ${prefix}\r
📊 Commands: ${uniqueCommands} (${totalCommands} with aliases)\r
\r
👥 Total Users: ${totalUsers}\r
💬 Total Threads: ${totalThreads}\r
\r
💡 Try typing "${prefix}help" to see available commands!\r
\r
👑 Bot Owner:`;

      // Share contact with text in single message
      // shareContact(text, contactID, threadID, callback)
      return api.shareContact(messageText, ownerID, threadID);

    } catch (error) {
      global.logger.error(`Error in prefix command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};