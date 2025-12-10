/**
 * Command: restart
 * Description: Restarts the bot
 * Usage: {prefix}restart
 * Permissions: ADMIN
 */

module.exports = {
  config: {
    name: 'restart',
    aliases: ['reboot', 'reload-bot'],
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: 'ADMIN',
    hasPrefix: true,
    description: 'Restarts the bot process',
    usage: '{prefix}restart',
    cooldown: 10,
    permission: 'ADMIN'
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;

    console.log(`[RESTART] Command called by user: ${senderID}`);

    // Check if user has permission
    const hasPermission = await global.permissions.checkPermission(senderID, this.config.permission);
    console.log(`[RESTART] Permission check result: ${hasPermission}`);

    if (!hasPermission) {
      console.log(`[RESTART] Permission denied for user ${senderID}`);
      return api.sendMessage(
        '❌ You do not have permission to use this command. Only administrators can restart the bot.',
        threadID,
        messageID
      );
    }

    // Send restart message asynchronously
    this.sendRestartMessage(api, threadID, messageID, senderID);

    // Call restart function after a small delay to ensure message is sent
    setTimeout(() => {
      this.performRestart(senderID);
    }, 500);
  },

  sendRestartMessage: async function (api, threadID, messageID, senderID) {
    try {
      console.log('[RESTART] Setting processing reaction...');
      api.setMessageReaction("⏳", messageID, () => { }, true);

      console.log('[RESTART] Sending restart message...');
      await api.sendMessage(
        '🔄 Bot is restarting...\n⏰ Please wait for the bot to come back online.',
        threadID,
        messageID
      );

      console.log('[RESTART] Message sent successfully!');
      api.setMessageReaction("✅", messageID, () => { }, true);

    } catch (error) {
      console.error(`[RESTART] Error sending message:`, error);
    }
  },

  performRestart: function (senderID) {
    console.log('[RESTART] Starting restart process...');

    // Log restart
    if (global.logger && global.logger.system) {
      global.logger.system(`Bot restart initiated by user ${senderID}`);
    }

    console.log('\n🔄 [RESTART] CALLING PROCESS.EXIT(2) NOW!');
    process.exit(2);
  }
};