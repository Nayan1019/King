/**
 * Slap Command
 * Allow users to slap another user with gender-based GIFs
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: 'slap',
    aliases: ['hit', 'punch'],
    description: 'Slap another user with a gender-based GIF',
    usage: '{prefix}slap [@mention]\n\n👩 Female users: Girl slaps boy\n👨 Male users: Boy slaps girl',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'FUN'
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
      // Set processing reaction
      api.setMessageReaction("⏳", messageID, () => {}, true);

      // Check if user mentioned someone
      const mentionKeys = Object.keys(mentions);
      
      if (mentionKeys.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          `❌ Please mention someone to slap!\n\nUsage: ${global.config.prefix}slap [@mention]`,
          threadID,
          messageID
        );
      }

      const targetID = mentionKeys[0];
      
      // Check if user is trying to slap themselves
      if (targetID === senderID) {
        api.setMessageReaction("😅", messageID, () => {}, true);
        return api.sendMessage(
          "🤔 You can't slap yourself! That would be weird...",
          threadID,
          messageID
        );
      }

      // Get user info to determine gender
      const userInfo = await api.getUserInfo(senderID);
      const userInfo2 = await api.getUserInfo(targetID);
      const senderInfo = userInfo[senderID];
      const targetInfo = userInfo2[targetID];

      if (!senderInfo || !targetInfo) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Could not get user information.", threadID, messageID);
      }

      // Determine gender for API
      // Gender: 1 = female, 2 = male
      // API: 'female' = girl slaps boy, 'male' = boy slaps girl
      let genderType = 'male'; // default
      if (senderInfo.gender === 1 || senderInfo.gender === 'FEMALE') {
        genderType = 'female';
      }

      global.logger.debug(`Slap command: Using gender ${genderType} for sender gender ${senderInfo.gender}`);

      // Get API key from config
      const apiKey = global.config?.apiKeys?.priyanshuApi || 'apim_PHNPYM8mq_Mpav9ue8sGJ6MNPAEvKNKJ13Uq1YZGcX4';

      // Fetch GIF directly from new API (returns arraybuffer)
      const response = await axios.post(
        'https://priyanshuapi.xyz/api/runner/slap-gif/fetch',
        { gender: genderType },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer', // Get GIF data directly
          timeout: 20000
        }
      );

      // Check if we got data
      if (!response.data || response.data.length === 0) {
        throw new Error('API did not return GIF data');
      }

      global.logger.debug(`Slap GIF fetched successfully, size: ${response.data.length} bytes`);
      global.logger.debug(`Response headers: ${JSON.stringify(response.headers)}`);

      // Use response data directly (no need to download again)
      const gifData = response.data;

      // Create temp file path
      const tempDir = path.join(__dirname, 'temp');
      const tempFilePath = path.join(tempDir, `slap_${senderID}_${Date.now()}.gif`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save GIF to temp file
      fs.writeFileSync(tempFilePath, gifData);

      // Create slap messages
      const slapMessages = [
        `💥 ${senderInfo.name} slapped ${targetInfo.name}!`,
        `👋 ${senderInfo.name} gave ${targetInfo.name} a good slap!`,
        `😤 ${senderInfo.name} couldn't hold back and slapped ${targetInfo.name}!`,
        `🤜 SLAP! ${senderInfo.name} hit ${targetInfo.name}!`,
        `💢 ${senderInfo.name} delivered a powerful slap to ${targetInfo.name}!`,
        `👏 ${senderInfo.name} clapped ${targetInfo.name} with a slap!`,
        `⚡ ${senderInfo.name} struck ${targetInfo.name} with lightning speed!`,
        `🎯 Direct hit! ${senderInfo.name} slapped ${targetInfo.name}!`
      ];

      const randomMessage = slapMessages[Math.floor(Math.random() * slapMessages.length)];

      // Send the GIF with message (keep HTTP path to preserve attachments)
      await api.sendMessage(
        {
          body: randomMessage,
          attachment: fs.createReadStream(tempFilePath),
          mentions: [
            { tag: `${senderInfo.name}`, id: senderID },
            { tag: `${targetInfo.name}`, id: targetID }
          ]
        },
        threadID,
        messageID
      );

      // Clean up temp file after sending
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            global.logger.debug(`Cleaned up temp file: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          global.logger.error(`Error cleaning up temp file: ${cleanupError.message}`);
        }
      }, 5000);

      // Set success reaction
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      // Set error reaction
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      global.logger.error('Error in slap command:', error.message);
      global.logger.error('Full error:', error);
      
      // Log API response details if available
      if (error.response) {
        global.logger.error('API Response Status:', error.response.status);
        global.logger.error('API Response Data:', error.response.data);
        global.logger.error('API Response Headers:', error.response.headers);
      }
      
      // Clean up temp file if it exists
      const tempDir = path.join(__dirname, 'temp');
      const tempFiles = fs.readdirSync(tempDir).filter(file => 
        file.startsWith(`slap_${senderID}_`) && file.endsWith('.gif')
      );
      
      tempFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (cleanupError) {
          global.logger.error(`Error cleaning up temp file: ${cleanupError.message}`);
        }
      });

      // Build user-friendly error message
      let errorMsg = '❌ Failed to load slap GIF.\n\n';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg += '⏰ Request timed out. Please try again.';
      } else if (error.response) {
        if (error.response.status === 401) {
          errorMsg += '🔑 API authentication failed. Please check API key.';
        } else if (error.response.status === 403) {
          errorMsg += '🚫 API access denied. Please contact admin.';
        } else if (error.response.status >= 500) {
          errorMsg += '🔧 API server error. Please try again later.';
        } else {
          errorMsg += `🔴 API Error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        errorMsg += '🌐 Network error. Please check your connection.';
      } else {
        errorMsg += '💥 Unexpected error. Please try again.';
      }
      
      return api.sendMessage(errorMsg, threadID, messageID);
    }
  }
};
