/**
 * Bio Command
 * Change the bot account's bio using editMessage
 */

module.exports = {
  config: {
    name: 'bio',
    aliases: ['setbio'],
    description: "Change the bot account's bio",
    usage: '{prefix}bio <your new bio>',
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
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;

    // Check if new bio is provided
    if (args.length === 0) {
      return api.sendMessage(
        `❌ Please provide a new bio.\n\n` +
        `📝 **Usage:**\n${global.config.prefix}bio <your new bio>\n\n` +
        `💡 **Example:**\n${global.config.prefix}bio I am a smart bot created to help you!`,
        threadID,
        messageID
      );
    }

    const newBio = args.join(' ');
    
    // Send initial processing message
    const processingMsg = await api.sendMessage('🔄 Updating bio...', threadID);
    
    try {
      // Update bot's bio - trying different possible API methods
      let success = false;
      let errorMessage = '';
      
      try {
        // Try changeBio method
        await api.changeBio(newBio);
        success = true;
      } catch (error1) {
        try {
          // Try setBio method
          await api.setBio(newBio);
          success = true;
        } catch (error2) {
          try {
            // Try updateBio method
            await api.updateBio(newBio);
            success = true;
          } catch (error3) {
            try {
              // Try using changeAbout method (alternative)
              await api.changeAbout(newBio);
              success = true;
            } catch (error4) {
              errorMessage = `Tried multiple methods:\n- changeBio: ${error1.message}\n- setBio: ${error2.message}\n- updateBio: ${error3.message}\n- changeAbout: ${error4.message}`;
            }
          }
        }
      }
      
      if (success) {
        // Use editMessage to update the processing message with success
        await api.editMessage(
          `✅ Bio updated successfully!\n\n📝 New Bio: "${newBio}"\n\n💡 It may take a few minutes to reflect on your profile.`,
          processingMsg.messageID
        );
      } else {
        // Use editMessage to update with error
        await api.editMessage(
          `❌ Failed to update bio.\n\n🔍 Debug Info:\n${errorMessage}`,
          processingMsg.messageID
        );
      }
      
    } catch (error) {
      console.error('Error in bio command:', error);
      try {
        // Use editMessage to show error
        await api.editMessage(
          `❌ An unexpected error occurred while updating the bio.\n\nError: ${error.message}`,
          processingMsg.messageID
        );
      } catch (editError) {
        // Fallback if editMessage fails
        api.sendMessage(
          `❌ An error occurred while updating the bio: ${error.message}`,
          threadID
        );
      }
    }
  }
};

