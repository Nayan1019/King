/**
 * ProfilePic Command
 * Change the bot account's profile picture using the replied photo
 */

// No additional imports needed since changeAvt handles URL directly

module.exports = {
  config: {
    name: 'profilepic',
    aliases: ['setprofilepic', 'setpic'],
    description: "Change the bot account's profile picture",
    usage: '{prefix}profilepic (reply to a photo)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'ADMIN'
  },

  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  run: async function({ api, message }) {
    const { threadID, messageID, messageReply } = message;

    // Check if message is a reply to an image
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ Please reply to a photo with this command!", threadID, messageID);
    }

    // Find image attachment
    const imageAttachment = messageReply.attachments.find(att => att.type === 'photo');

    if (!imageAttachment) {
      return api.sendMessage("❌ The replied message doesn't contain an image! Please reply to a photo.", threadID, messageID);
    }

    try {
      const statusMsg = await api.sendMessage("🔄 Changing profile picture...", threadID);

      // Get image URL with validation
      const imageUrl = imageAttachment.url || imageAttachment.href || imageAttachment.largePreviewUrl || imageAttachment.previewUrl;
      
      console.log('[PROFILEPIC DEBUG] Image attachment:', JSON.stringify(imageAttachment, null, 2));
      console.log('[PROFILEPIC DEBUG] Selected imageUrl:', imageUrl);
      
      if (!imageUrl) {
        return api.editMessage("❌ Could not get image URL from attachment!", statusMsg.messageID);
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch (urlError) {
        console.error('[PROFILEPIC] Invalid URL:', imageUrl);
        return api.editMessage(`❌ Invalid image URL format!\n\nURL: ${imageUrl}`, statusMsg.messageID);
      }

      // Update status: setting profile picture
      api.editMessage("🔄 Setting as profile picture...", statusMsg.messageID);

      // Change profile picture using api.changeAvt (it accepts URL directly)
      let success = false;
      let errorMessage = '';
      
      try {
        // changeAvt accepts URL directly, no need to download first
        await api.changeAvt(imageUrl);
        success = true;
        console.log('[PROFILEPIC] Successfully changed avatar using changeAvt');
      } catch (error1) {
        console.error('[PROFILEPIC] changeAvt failed:', error1.message);
        errorMessage = `changeAvt failed: ${error1.message}`;
      }
      
      if (success) {
        return api.editMessage(
          "✅ Profile picture changed successfully! 📸\n\n💡 It may take a few minutes to update across Facebook.",
          statusMsg.messageID
        );
      } else {
        return api.editMessage(
          `❌ Failed to change profile picture.\n\n🔍 Debug Info:\n${errorMessage}`,
          statusMsg.messageID
        );
      }

    } catch (error) {
      console.error("Error changing profile picture:", error);
      return api.sendMessage("❌ Failed to change profile picture. Please try again.", threadID, messageID);
    }
  }
};

