/**
 * Image Filters Command
 * Applies various filters to profile pictures using discord-image-generation library
 */

const DIG = require('discord-image-generation');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const streamifier = require('streamifier');

module.exports = {
  config: {
    name: 'imagefilters',
    aliases: ['imgfilter', 'filters'],
    description: 'Apply filters to profile pictures',
    usage: '{prefix}imagefilters [filter] [@mention]',
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
          `🖼️ 𝐈𝐦𝐚𝐠𝐞 𝐅𝐢𝐥𝐭𝐞𝐫𝐬\n\n` +
          `Available filters:\n` +
          `- greyscale: Convert image to black and white\n` +
          `- invert: Invert image colors\n` +
          `- sepia: Apply sepia tone filter\n` +
          `- brightness: Increase image brightness\n` +
          `- darkness: Decrease image brightness\n` +
          `- circle: Make image circular\n\n` +
          `Usage: ${global.config.prefix}imagefilters [filter] [@mention]\n\n` +
          `Example: ${global.config.prefix}imagefilters greyscale @friend`,
          threadID,
          messageID
        );
      }
      
      // Get the filter type
      const filter = args[0].toLowerCase();
      
      // Check if filter is valid
      const validFilters = ['greyscale', 'invert', 'sepia', 'brightness', 'darkness', 'circle'];
      if (!validFilters.includes(filter)) {
        return api.sendMessage(
          `❌ Invalid filter. Available filters: ${validFilters.join(', ')}`,
          threadID,
          messageID
        );
      }
      
      // Get target user ID (mentioned user or sender)
      let targetID = senderID;
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
      }
      
      // Send a processing message
      api.sendMessage(
        `⏳ Processing ${filter} filter...`,
        threadID,
        messageID
      );
      
      // Get profile picture
      const targetAvatar = await getProfilePicture(api, targetID);
      
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      // Generate the image based on the filter
      let img;
      switch (filter) {
        case 'greyscale':
          img = await new DIG.Greyscale().getImage(targetAvatar);
          break;
        case 'invert':
          img = await new DIG.Invert().getImage(targetAvatar);
          break;
        case 'sepia':
          img = await new DIG.Sepia().getImage(targetAvatar);
          break;
        case 'brightness':
          img = await new DIG.Brightness().getImage(targetAvatar, 30); // Increase brightness by 30%
          break;
        case 'darkness':
          img = await new DIG.Darkness().getImage(targetAvatar, 30); // Decrease brightness by 30%
          break;
        case 'circle':
          img = await new DIG.Circle().getImage(targetAvatar);
          break;
      }
      
      // Save the image to a temporary file
      const outputPath = path.join(tempDir, `${filter}_${Date.now()}.png`);
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
      global.logger.error(`Error in imagefilters command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred while applying the filter: ${error.message}`,
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