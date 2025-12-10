/**
 * Image Combine Command
 * Combines two profile pictures with various effects
 */

const DIG = require('discord-image-generation');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const streamifier = require('streamifier');

module.exports = {
  config: {
    name: 'imagecombine',
    aliases: ['imgcombine'],
    description: 'Combine two profile pictures with effects',
    usage: '{prefix}imagecombine [effect] [@mention1] [@mention2]',
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
          `🖼️ 𝐈𝐦𝐚𝐠𝐞 𝐂𝐨𝐦𝐛𝐢𝐧𝐞\n\n` +
          `Available effects:\n` +
          `- ship: Create a ship image (love meter)\n` +
          `- vs: Create a versus image\n` +
          `- fusion: Fuse two profile pictures\n` +
          `- kiss: Create a kiss image\n` +
          `- slap: Create a slap image\n` +
          `- spank: Create a spank image\n\n` +
          `Usage: ${global.config.prefix}imagecombine [effect] [@mention1] [@mention2]\n\n` +
          `Example: ${global.config.prefix}imagecombine ship @friend1 @friend2`,
          threadID,
          messageID
        );
      }
      
      // Get the effect type
      const effect = args[0].toLowerCase();
      
      // Check if effect is valid
      const validEffects = ['ship', 'vs', 'fusion', 'kiss', 'slap', 'spank'];
      if (!validEffects.includes(effect)) {
        return api.sendMessage(
          `❌ Invalid effect. Available effects: ${validEffects.join(', ')}`,
          threadID,
          messageID
        );
      }
      
      // Check if we have enough mentions
      const mentionKeys = Object.keys(mentions);
      
      // If no mentions, use sender and first mention
      let firstUserID = senderID;
      let secondUserID;
      
      if (mentionKeys.length === 0) {
        return api.sendMessage(
          `❌ Please mention at least one person.\nExample: ${global.config.prefix}imagecombine ${effect} @friend`,
          threadID,
          messageID
        );
      } else if (mentionKeys.length === 1) {
        // If only one mention, use sender as first and mention as second
        secondUserID = mentionKeys[0];
      } else {
        // If two or more mentions, use first two mentions
        firstUserID = mentionKeys[0];
        secondUserID = mentionKeys[1];
      }
      
      // Send a processing message
      api.sendMessage(
        `⏳ Processing ${effect} effect...`,
        threadID,
        messageID
      );
      
      // Get profile pictures
      const firstAvatar = await getProfilePicture(api, firstUserID);
      const secondAvatar = await getProfilePicture(api, secondUserID);
      
      // Create temporary directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temporary');
      await fs.ensureDir(tempDir);
      
      // Generate the image based on the effect
      let img;
      switch (effect) {
        case 'ship':
          // Generate a random love percentage
          const lovePercentage = Math.floor(Math.random() * 101);
          img = await new DIG.Love().getImage(firstAvatar, secondAvatar);
          break;
        case 'vs':
          img = await new DIG.Vs().getImage(firstAvatar, secondAvatar);
          break;
        case 'fusion':
          img = await new DIG.Fusion().getImage(firstAvatar, secondAvatar);
          break;
        case 'kiss':
          img = await new DIG.Kiss().getImage(firstAvatar, secondAvatar);
          break;
        case 'slap':
          img = await new DIG.Batslap().getImage(firstAvatar, secondAvatar);
          break;
        case 'spank':
          img = await new DIG.Spank().getImage(firstAvatar, secondAvatar);
          break;
      }
      
      // Save the image to a temporary file
      const outputPath = path.join(tempDir, `${effect}_${Date.now()}.png`);
      await fs.writeFile(outputPath, img);
      
      // Get user names for the message
      const firstName = await getUserName(api, firstUserID);
      const secondName = await getUserName(api, secondUserID);
      
      // Create a custom message based on the effect
      let customMessage = '';
      if (effect === 'ship') {
        const lovePercentage = Math.floor(Math.random() * 101);
        let loveStatus;
        
        if (lovePercentage < 20) {
          loveStatus = 'Just friends 😐';
        } else if (lovePercentage < 40) {
          loveStatus = 'Maybe someday 🤔';
        } else if (lovePercentage < 60) {
          loveStatus = 'There\'s potential 😊';
        } else if (lovePercentage < 80) {
          loveStatus = 'Looking good! 😍';
        } else {
          loveStatus = 'Perfect match! 💕';
        }
        
        customMessage = `💖 𝐋𝐨𝐯𝐞 𝐌𝐞𝐭𝐞𝐫: ${firstName} & ${secondName}\n` +
                       `💓 Match: ${lovePercentage}%\n` +
                       `💌 Status: ${loveStatus}`;
      }
      
      // Send the image with custom message if applicable
      if (customMessage) {
        api.sendMessage(
          {
            body: customMessage,
            attachment: fs.createReadStream(outputPath)
          },
          threadID,
          () => {
            // Delete the temporary file after sending
            fs.unlink(outputPath).catch(err => {
              global.logger.error(`Error deleting temporary file: ${err.message}`);
            });
          },
          messageID
        );
      } else {
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
      }
      
    } catch (error) {
      global.logger.error(`Error in imagecombine command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred while combining images: ${error.message}`,
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

/**
 * Get user name from Facebook API
 * @param {Object} api - Facebook API instance
 * @param {string} userID - Facebook user ID
 * @returns {Promise<string>} - User name
 */
async function getUserName(api, userID) {
  try {
    // Get user info from Facebook API
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo(userID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    });
    
    return userInfo[userID].name || 'Unknown User';
  } catch (error) {
    global.logger.error(`Error getting user name: ${error.message}`);
    return 'Unknown User';
  }
}