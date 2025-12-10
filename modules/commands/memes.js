/**
 * Meme Generator Command
 * Creates popular memes using discord-image-generation library
 */

const DIG = require('discord-image-generation');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const streamifier = require('streamifier');

module.exports = {
  config: {
    name: 'memes',
    aliases: ['meme', 'memegen'],
    description: 'Generate popular memes',
    usage: '{prefix}memes [type] [text]',
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
          `🖼️ 𝐌𝐞𝐦𝐞 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐨𝐫\n\n` +
          `Available meme types:\n` +
          `- changemymind: Change My Mind meme\n` +
          `- drake: Drake Hotline Bling meme (requires two texts)\n` +
          `- podium: 1st/2nd/3rd Place Podium meme (requires three texts)\n` +
          `- poutine: Distracted Boyfriend meme (requires three texts)\n` +
          `- bed: Bed meme (requires two texts)\n` +
          `- facepalm: Facepalm meme\n\n` +
          `Usage: ${global.config.prefix}memes [type] [text]\n\n` +
          `Examples:\n` +
          `${global.config.prefix}memes changemymind This is the best bot\n` +
          `${global.config.prefix}memes drake Text 1 | Text 2`,
          threadID,
          messageID
        );
      }
      
      // Get the meme type
      const memeType = args[0].toLowerCase();
      
      // Check if meme type is valid
      const validMemeTypes = ['changemymind', 'drake', 'podium', 'poutine', 'bed', 'facepalm'];
      if (!validMemeTypes.includes(memeType)) {
        return api.sendMessage(
          `❌ Invalid meme type. Available types: ${validMemeTypes.join(', ')}`,
          threadID,
          messageID
        );
      }
      
      // Remove the meme type from args
      args.shift();
      
      // Get the text for the meme
      if (args.length === 0) {
        return api.sendMessage(
          `❌ Please provide text for the meme.`,
          threadID,
          messageID
        );
      }
      
      // Send a processing message
      api.sendMessage(
        `⏳ Generating ${memeType} meme...`,
        threadID,
        messageID
      );
      
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      // Get profile picture for some memes
      let targetAvatar;
      if (memeType === 'facepalm') {
        // Get target user ID (mentioned user or sender)
        let targetID = senderID;
        if (Object.keys(mentions).length > 0) {
          targetID = Object.keys(mentions)[0];
        }
        targetAvatar = await getProfilePicture(api, targetID);
      }
      
      // Generate the meme based on the type
      let img;
      let fullText = args.join(' ');
      
      switch (memeType) {
        case 'changemymind':
          img = await new DIG.ChangeMyMind().getImage(fullText);
          break;
          
        case 'drake':
          // Split text by | for drake meme
          const drakeParts = fullText.split('|');
          if (drakeParts.length < 2) {
            return api.sendMessage(
              `❌ Drake meme requires two texts separated by |\nExample: ${global.config.prefix}memes drake Text 1 | Text 2`,
              threadID,
              messageID
            );
          }
          img = await new DIG.Drake().getImage(drakeParts[0].trim(), drakeParts[1].trim());
          break;
          
        case 'podium':
          // Split text by | for podium meme
          const podiumParts = fullText.split('|');
          if (podiumParts.length < 3) {
            return api.sendMessage(
              `❌ Podium meme requires three texts separated by |\nExample: ${global.config.prefix}memes podium 1st | 2nd | 3rd`,
              threadID,
              messageID
            );
          }
          img = await new DIG.Podium().getImage(podiumParts[0].trim(), podiumParts[1].trim(), podiumParts[2].trim());
          break;
          
        case 'poutine':
          // Split text by | for poutine (distracted boyfriend) meme
          const poutineParts = fullText.split('|');
          if (poutineParts.length < 3) {
            return api.sendMessage(
              `❌ Distracted Boyfriend meme requires three texts separated by |\nExample: ${global.config.prefix}memes poutine Text 1 | Text 2 | Text 3`,
              threadID,
              messageID
            );
          }
          img = await new DIG.Poutine().getImage(poutineParts[0].trim(), poutineParts[1].trim(), poutineParts[2].trim());
          break;
          
        case 'bed':
          // Split text by | for bed meme
          const bedParts = fullText.split('|');
          if (bedParts.length < 2) {
            return api.sendMessage(
              `❌ Bed meme requires two texts separated by |\nExample: ${global.config.prefix}memes bed Text 1 | Text 2`,
              threadID,
              messageID
            );
          }
          img = await new DIG.Bed().getImage(bedParts[0].trim(), bedParts[1].trim());
          break;
          
        case 'facepalm':
          img = await new DIG.Facepalm().getImage(targetAvatar);
          break;
      }
      
      // Save the image to a temporary file
      const outputPath = path.join(tempDir, `${memeType}_${Date.now()}.png`);
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
      global.logger.error(`Error in memes command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred while generating the meme: ${error.message}`,
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