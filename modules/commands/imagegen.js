/**
 * Image Generation Command
 * Creates fun image effects using discord-image-generation library
 */

const DIG = require('discord-image-generation');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const streamifier = require('streamifier');

module.exports = {
  config: {
    name: 'imagegen',
    aliases: ['img', 'image'],
    description: 'Generate fun image effects',
    usage: '{prefix}imagegen [effect] [@mention]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
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
      // If no arguments, show help
      if (args.length === 0) {
        return api.sendMessage(
          `🖼️ 𝐈𝐦𝐚𝐠𝐞 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐨𝐧\n\n` +
          `Available effects:\n` +
          `- rip: Create a RIP effect\n` +
          `- triggered: Create a triggered effect\n` +
          `- spank: Spank someone (requires @mention)\n` +
          `- jail: Put someone behind bars\n` +
          `- trash: Put someone in the trash\n` +
          `- blur: Blur someone's profile picture\n\n` +
          `Usage: ${global.config.prefix}imagegen [effect] [@mention]\n\n` +
          `Example: ${global.config.prefix}imagegen rip @friend`,
          threadID,
          messageID
        );
      }
      
      // Get the effect type
      const effect = args[0].toLowerCase();
      
      // Check if effect is valid
      const validEffects = ['rip', 'triggered', 'spank', 'jail', 'trash', 'blur'];
      if (!validEffects.includes(effect)) {
        return api.sendMessage(
          `❌ Invalid effect. Available effects: ${validEffects.join(', ')}`,
          threadID,
          messageID
        );
      }
      
      // Get target user ID (mentioned user or sender)
      let targetID = senderID;
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
      }
      
      // For spank effect, we need two users
      if (effect === 'spank' && Object.keys(mentions).length === 0) {
        return api.sendMessage(
          `❌ The spank effect requires you to mention someone.`,
          threadID,
          messageID
        );
      }
      
      // Send a processing message
      api.sendMessage(
        `⏳ Processing ${effect} effect...`,
        threadID,
        messageID
      );
      
      // Get profile pictures
      const targetAvatar = await getProfilePicture(api, targetID);
      
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      // Generate the image based on the effect
      let img;
      switch (effect) {
        case 'rip':
          img = await new DIG.Rip().getImage(targetAvatar);
          break;
        case 'triggered':
          img = await new DIG.Triggered().getImage(targetAvatar);
          break;
        case 'jail':
          img = await new DIG.Jail().getImage(targetAvatar);
          break;
        case 'trash':
          img = await new DIG.Trash().getImage(targetAvatar);
          break;
        case 'blur':
          img = await new DIG.Blur().getImage(targetAvatar);
          break;
        case 'spank':
          // For spank, we need the sender's avatar too
          const senderAvatar = await getProfilePicture(api, senderID);
          img = await new DIG.Spank().getImage(senderAvatar, targetAvatar);
          break;
      }
      
      // Save the image to a temporary file
      const outputPath = path.join(tempDir, `${effect}_${Date.now()}.png`);
      await fs.writeFile(outputPath, img);
      
      // Send the image
      api.sendMessage(
        { attachment: fs.createReadStream(outputPath) },
        threadID,
        () => {
          // Delete the temporary file after sending
          fs.unlink(outputPath).catch(err => {
            global.logger.error(`Error deleting temporary file: ${err.message}`);
          });
        },
        messageID
      );
      
    } catch (error) {
      global.logger.error(`Error in imagegen command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred while generating the image: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};

/**
 * Get profile picture URL for a user
 * @param {Object} api - Facebook API instance
 * @param {string} userID - Facebook user ID
 * @returns {Promise<Buffer>} - Image buffer
 */
async function getProfilePicture(api, userID) {
  try {
    // Get user info from Facebook API
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo(userID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    });
    
    // Use Facebook Graph API to get high quality profile picture
    // This provides much better quality than thumbSrc
    const profileUrl = `https://graph.facebook.com/${userID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    
    // No need to check if profileUrl exists since we're constructing it directly
    
    // Download the profile picture
    const response = await axios.get(profileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    global.logger.error(`Error getting profile picture: ${error.message}`);
    throw new Error('Could not get profile picture');
  }
}