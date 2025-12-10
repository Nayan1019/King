/**
 * Notify Command
 * Send notifications to all groups in database
 */

const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports = {
  config: {
    name: 'notify',
    aliases: ['notification', 'broadcast'],
    description: 'Send notification to all groups in database',
    usage: '{prefix}notify <message> (reply to image/video for media)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN', // Only admins can use this
    cooldown: 30,
    category: 'ADMIN'
  },

  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, messageReply } = message;
    
    // Check if user is admin
    const isOwner = senderID === global.config.ownerID;
    const isAdmin = global.config.adminIDs.includes(senderID);
    
    if (!isOwner && !isAdmin) {
      return api.sendMessage("❌ You don't have permission to use this command. Only admins can send notifications.", threadID, messageID);
    }

    // Check if message is provided
    if (args.length === 0) {
      return api.sendMessage(
        "❌ Please provide a notification message.\n\n" +
        "Usage:\n" +
        `• ${global.config.prefix}notify <message>\n` +
        `• Reply to an image/video and use ${global.config.prefix}notify <message> to include media\n\n` +
        "Example:\n" +
        `${global.config.prefix}notify Important update: Bot maintenance scheduled for tonight!`,
        threadID, 
        messageID
      );
    }

    const notificationText = args.join(" ");
    let mediaAttachment = null;
    let mediaType = null;
    let tempFilePath = null; // Store temp file path for cleanup

    // Check if user replied to a message with media
    if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
      const attachment = messageReply.attachments[0];
      
      if (attachment.type === 'photo' || attachment.type === 'video') {
        try {
          console.log(`[notify] Downloading ${attachment.type} for notification...`);
          const response = await axios.get(attachment.url, { responseType: 'stream' });
          
          // Create temp file path
          const ext = attachment.type === 'photo' ? 'jpg' : 'mp4';
          const tempPath = path.join(__dirname, 'temp', `notification_${Date.now()}.${ext}`);
          
          // Ensure temp directory exists
          await fs.ensureDir(path.dirname(tempPath));
          
          // Save file
          const writer = fs.createWriteStream(tempPath);
          response.data.pipe(writer);
          
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          
          mediaAttachment = fs.createReadStream(tempPath);
          mediaType = attachment.type;
          tempFilePath = tempPath; // Store for cleanup
          
          console.log(`[notify] ${attachment.type} saved successfully for notification`);
        } catch (error) {
          console.error(`[notify] Error downloading media:`, error);
          return api.sendMessage("❌ Failed to download media attachment. Sending text-only notification.", threadID, messageID);
        }
      }
    }

    try {
      // Get all threads from database
      const allThreads = await global.Thread.find({});
      const totalThreads = allThreads.length;

      if (totalThreads === 0) {
        // Clean up temp file if it exists before returning
        if (tempFilePath) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`[notify] Cleaned up temp file on early exit: ${path.basename(tempFilePath)}`);
          } catch (cleanupError) {
            console.error('[notify] Error cleaning up temp file on early exit:', cleanupError);
          }
        }
        return api.sendMessage("❌ No groups found in database.", threadID, messageID);
      }

      // Send confirmation message
      const confirmMsg = await api.sendMessage(
        `📢 **NOTIFICATION BROADCAST STARTED**\n\n` +
        `📝 Message: "${notificationText}"\n` +
        `${mediaType ? `📎 Media: ${mediaType}\n` : ''}` +
        `🎯 Target Groups: ${totalThreads}\n` +
        `⏱️ Estimated Time: ${Math.ceil(totalThreads * 3)} seconds\n\n` +
        `🔄 Status: Starting broadcast...`,
        threadID
      );

      let successCount = 0;
      let failCount = 0;
      let processedCount = 0;

      // Send notifications one by one with delay
      for (const thread of allThreads) {
        try {
          const targetThreadID = thread.threadID;
          
          // Skip if it's the same thread where command was used
          if (targetThreadID === threadID) {
            processedCount++;
            continue;
          }

          // Prepare message object
          const messageToSend = {
            body: `📢 **NOTIFICATION FROM ADMIN**\n\n${notificationText}\n\n` +
                  `⏰ Sent at: ${new Date().toLocaleString()}\n` +
                  `🤖 Via: ${global.config.botName || 'Bot'}`
          };

          // Add media if available
          if (tempFilePath && mediaType) {
            // Create new stream for each group using stored temp path
            messageToSend.attachment = fs.createReadStream(tempFilePath);
          }

          // Send notification
          await api.sendMessage(messageToSend, targetThreadID);
          successCount++;
          
          console.log(`[notify] ✅ Sent to group ${targetThreadID} (${successCount}/${totalThreads})`);
          
        } catch (error) {
          failCount++;
          console.error(`[notify] ❌ Failed to send to group ${thread.threadID}:`, error.message);
        }

        processedCount++;

        // Update progress every 10 groups
        if (processedCount % 10 === 0 || processedCount === totalThreads) {
          try {
            await api.editMessage(
              `📢 **NOTIFICATION BROADCAST IN PROGRESS**\n\n` +
              `📝 Message: "${notificationText}"\n` +
              `${mediaType ? `📎 Media: ${mediaType}\n` : ''}` +
              `🎯 Total Groups: ${totalThreads}\n` +
              `✅ Successful: ${successCount}\n` +
              `❌ Failed: ${failCount}\n` +
              `📊 Progress: ${processedCount}/${totalThreads} (${Math.round((processedCount/totalThreads)*100)}%)\n\n` +
              `${processedCount === totalThreads ? '🎉 **BROADCAST COMPLETED!**' : '🔄 Broadcasting...'}`,
              confirmMsg.messageID
            );
          } catch (editError) {
            console.error('[notify] Error updating progress:', editError);
          }
        }

        // Add delay to prevent rate limiting (3 seconds between messages)
        if (processedCount < totalThreads) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Clean up media file if it exists
      if (tempFilePath) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[notify] Cleaned up temporary media file: ${path.basename(tempFilePath)}`);
        } catch (cleanupError) {
          console.error('[notify] Error cleaning up media file:', cleanupError);
        }
      }

      // Final success message
      const finalMessage = 
        `🎉 **NOTIFICATION BROADCAST COMPLETED!**\n\n` +
        `📊 **Final Statistics:**\n` +
        `✅ Successfully sent: ${successCount}\n` +
        `❌ Failed to send: ${failCount}\n` +
        `🎯 Total processed: ${processedCount}\n` +
        `⏱️ Total time: ${Math.ceil(processedCount * 3)} seconds\n\n` +
        `📝 Message: "${notificationText}"\n` +
        `${mediaType ? `📎 Media type: ${mediaType}\n` : ''}` +
        `⏰ Completed at: ${new Date().toLocaleString()}`;

      await api.editMessage(finalMessage, confirmMsg.messageID);

      console.log(`[notify] Broadcast completed! Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
      console.error('[notify] Error during broadcast:', error);
      return api.sendMessage(
        `❌ **BROADCAST FAILED**\n\n` +
        `Error: ${error.message}\n` +
        `Please try again or contact the developer.`,
        threadID,
        messageID
      );
    }
  }
};
