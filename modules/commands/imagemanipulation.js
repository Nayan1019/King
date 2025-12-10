/**
 * Image Manipulation Command
 * Advanced image manipulation effects using discord-image-generation library
 */

const DIG = require('discord-image-generation');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const streamifier = require('streamifier');

module.exports = {
  config: {
    name: 'imagemanipulation',
    aliases: ['imgmanip', 'manipulate'],
    description: 'Apply advanced image manipulation effects',
    usage: '{prefix}imagemanipulation [effect] [@mention] [text]',
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
          `🖼️ 𝐈𝐦𝐚𝐠𝐞 𝐌𝐚𝐧𝐢𝐩𝐮𝐥𝐚𝐭𝐢𝐨𝐧\n\n` +
          `Available effects:\n` +
          `- pixelate: Pixelate an image\n` +
          `- rainbow: Apply rainbow effect\n` +
          `- ad: Create an advertisement with text\n` +
          `- bobross: Bob Ross painting effect\n` +
          `- confusedstonk: Confused Stonks meme\n` +
          `- stonk: Stonks meme\n` +
          `- notstonk: Not Stonks meme\n\n` +
          `Usage: ${global.config.prefix}imagemanipulation [effect] [@mention] [text]\n\n` +
          `Example: ${global.config.prefix}imagemanipulation ad @friend Buy this product!`,
          threadID,
          messageID
        );
      }
      
      // Get the effect type
      const effect = args[0].toLowerCase();
      
      // Check if effect is valid
      const validEffects = ['pixelate', 'rainbow', 'ad', 'bobross', 'confusedstonk', 'stonk', 'notstonk'];
      if (!validEffects.includes(effect)) {
        return api.sendMessage(
          `❌ Invalid effect. Available effects: ${validEffects.join(', ')}`,
          threadID,
          messageID
        );
      }
      
      // Remove the effect from args
      args.shift();
      
      // Get target user ID (mentioned user or sender)
      let targetID = senderID;
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        // Remove the mention from args
        const mentionValue = mentions[targetID];
        const mentionIndex = args.findIndex(arg => arg.includes(mentionValue));
        if (mentionIndex !== -1) {
          args.splice(mentionIndex, 1);
        }
      }
      
      // For ad effect, we need text
      if (effect === 'ad' && args.length === 0) {
        return api.sendMessage(
          `❌ The ad effect requires text.\nExample: ${global.config.prefix}imagemanipulation ad @friend Buy this product!`,
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
      
      // Get profile picture
      const targetAvatar = await getProfilePicture(api, targetID);
      
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      // Generate the image based on the effect
      let img;
      switch (effect) {
        case 'pixelate':
          img = await new DIG.Pixelize().getImage(targetAvatar);
          break;
        case 'rainbow':
          img = await new DIG.Gay().getImage(targetAvatar);
          break;
        case 'ad':
          const adText = args.join(' ');
          img = await new DIG.Ad().getImage(targetAvatar, adText);
          break;
        case 'bobross':
          img = await new DIG.Bobross().getImage(targetAvatar);
          break;
        case 'confusedstonk':
          img = await new DIG.ConfusedStonk().getImage(targetAvatar);
          break;
        case 'stonk':
          img = await new DIG.Stonk().getImage(targetAvatar);
          break;
        case 'notstonk':
          img = await new DIG.NotStonk().getImage(targetAvatar);
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
      global.logger.error(`Error in imagemanipulation command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred while applying the effect: ${error.message}`,
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