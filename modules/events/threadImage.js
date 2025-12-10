/**
 * Thread Image Change Event
 * Handles when a group chat's image is changed
 */

module.exports = {
  config: {
    name: 'threadImage',
    description: 'Handles thread image change events',
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭"
  },
  
  /**
   * Event execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.logMessageData - Event data
   */
  run: async function({ api, message, logMessageData }) {
    const { threadID, author, image } = message;
    
    try {
      // Debug log to see what's in the message
      global.logger.debug(`Thread image change event data - message: ${JSON.stringify(message)}`);
      global.logger.debug(`Thread image change event handler called with type: ${message.type}`);
      global.logger.debug(`Thread image change event handler called with author: ${author}`);
      global.logger.debug(`Thread image change event handler called with threadID: ${threadID}`);
      
      if (!author) {
        global.logger.error(`Missing author in thread image change event`);
        return;
      }
      
      if (!image) {
        global.logger.error(`Missing image data in thread image change event`);
        return;
      }
      
      // Check if anti-thread settings exist for this thread
      const antiThread = await global.AntiThread.findOne({ threadID });
      
      // Check if user has permission to make changes
      const hasPermission = await global.permissions.checkPermission(author, 'SUPPORTER');
      
      // If group image lock is enabled and user doesn't have permission, revert the change
      if (antiThread && antiThread.groupImageLock && !hasPermission) {
        global.logger.system(`Unauthorized group image change detected from user ${author}`);
        
        // If we have an original image, revert the change
        if (antiThread.originalGroupImage) {
          try {
            // Try to change the group image back using the stored URL
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');

            const imagePath = path.join(__dirname, 'temp_image.jpg'); // Temporary file to store the image

            try {
              const response = await axios({ url: antiThread.originalGroupImage, responseType: 'stream' });
              const writer = fs.createWriteStream(imagePath);
              response.data.pipe(writer);

              await new Promise((resolve, reject) => {
                writer.on('finish', () => {
                  api.changeGroupImage(fs.createReadStream(imagePath), threadID, (err) => {
                    if (err) {
                      global.logger.error('Error restoring group image:', err.message);
                      reject(err);
                    } else {
                      resolve();
                    }
                  });
                });
                writer.on('error', reject);
              });
            } finally {
              // Clean up the temporary file
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
              }
            }
            
            // Send notification
            api.sendMessage(
              '🔒 Group image is locked. Your change has been reverted.',
              threadID
            );
            
            global.logger.system(`Reverted unauthorized group image change`);
            return; // Exit early, don't update database or send confirmation
          } catch (revertError) {
            global.logger.error(`Failed to revert group image: ${revertError.message}`);
            // Continue with normal processing if revert fails
          }
        } else {
          // Send notification that we can't automatically revert the image
          api.sendMessage(
            '🔒 Group image is locked. Please do not change it.',
            threadID
          );
          global.logger.warn(`Could not revert group image for thread ${threadID} because originalGroupImage was invalid.`);
        }
      }
      
      // If user has permission and group image lock is enabled, update the stored original image
      if (antiThread && antiThread.groupImageLock && hasPermission) {
        if (image && image.url && typeof image.url === 'string' && image.url.length > 0) {
          antiThread.originalGroupImage = image.url;
          antiThread.lastUpdated = new Date();
          await antiThread.save();
          global.logger.system(`Privileged user updated protected group image`);
        } else {
          global.logger.warn(`Could not save original group image for thread ${threadID} because image.url was invalid.`);
        }
      }
      
      // Get user info of the person who changed the image
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo(author, (err, info) => {
          if (err) return reject(err);
          resolve(info[author]);
        });
      });
      
      global.logger.debug(`Got user info for ${author}: ${JSON.stringify(userInfo)}`);
      
      
      const userName = userInfo.name || 'Facebook User';
      
      // Update thread info in database
      try {
        // Check if thread exists using thread controller
        const threadExists = await global.controllers.thread.exists(threadID);
        
        if (threadExists) {
          // Update thread image URL in database
          await global.controllers.thread.updateThreadImage(threadID, image.url);
          global.logger.database(`Updated thread image for ${threadID}`);
        }
      } catch (dbError) {
        global.logger.error(`Error updating thread image in database: ${dbError.message}`);
      }
      
      // Send a confirmation message if needed
      // Only send if announceImageChange is enabled and antichange for group image is not enabled
      if (global.config.announceImageChange && (!antiThread || !antiThread.groupImageLock || hasPermission)) {
        // Customize message based on lock status
        let message = `✅ Group image has been updated by ${userName}`;
        
        // If this was a privileged user updating a locked image, add that info
        if (antiThread && antiThread.groupImageLock && hasPermission) {
          message += ` (with admin privileges)`;
        }
        
        api.sendMessage(message, threadID);
      } else if (antiThread && antiThread.groupImageLock && !hasPermission) {
        global.logger.system(`Suppressed group image update message because antichange is enabled for thread ${threadID}`);
      }
      
    } catch (error) {
      global.logger.error(`Error in threadImage event: ${error.message}`);
    }
  }
};