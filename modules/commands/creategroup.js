/**
 * CreateGroup Command
 * Create a new group with specified users and optional title
 */

module.exports = {
  config: {
    name: 'creategroup',
    aliases: ['newgroup', 'startgroup'],
    description: 'Create a new group with specified users and optional title',
    usage: '{prefix}creategroup <user1,user2,...> [group title]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 10,
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

    // Validate arguments
    if (args.length < 1) {
      return api.sendMessage('❌ Please provide at least two user IDs to add.\nExample usage: {prefix}creategroup <user1,user2,...> [group title]', threadID, messageID);
    }

    // Extract user IDs and optional group title
    const userIDs = args[0].split(',');
    const groupTitle = args.slice(1).join(' ') || 'New Group';

    if (userIDs.length < 2) {
      return api.sendMessage('❌ You need at least two user IDs to create a group.', threadID, messageID);
    }

    try {
      api.sendMessage(`🔄 Creating new group '${groupTitle}' with users: ${userIDs.join(', ')}...`, threadID, messageID);

      // Create new group
      api.createNewGroup(userIDs, groupTitle, (err, newThreadID) => {
        if (err) {
          console.error('Error creating new group:', err);
          return api.sendMessage('❌ Failed to create a new group. Please check the user IDs and try again.', threadID, messageID);
        }
        
        // Success message
        api.sendMessage(`✅ Successfully created new group '${groupTitle}' with ID: ${newThreadID}`, threadID, messageID);
      });
    } catch (error) {
      console.error('Error in creategroup command:', error);
      return api.sendMessage('❌ An error occurred while trying to create the group.', threadID, messageID);
    }
  }
};

