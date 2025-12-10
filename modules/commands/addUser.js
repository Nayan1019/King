/**
 * Add User Command
 * Adds a user to a group chat using their Facebook ID or profile link
 */

module.exports = {
  config: {
    name: 'adduser',
    aliases: ['add', 'invite'],
    description: 'Adds a user to the current group chat',
    usage: '{prefix}adduser <uid/facebook_profile_link>',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'UTILITY'
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    // Check if user has admin permission
    const isAdmin = await global.permissions.checkPermission(senderID, 'ADMIN');
    if (!isAdmin) {
      return api.sendMessage('❌ You need ADMIN permission to use this command.', threadID, messageID);
    }
    
    // Check if this is a group chat
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.isGroup) {
      return api.sendMessage('❌ This command can only be used in group chats.', threadID, messageID);
    }
    
    // Check if argument is provided
    if (args.length === 0) {
      return api.sendMessage(
        '❌ Please provide a Facebook user ID or profile link.\n' +
        'Usage: {prefix}adduser <uid/facebook_profile_link>',
        threadID, messageID
      );
    }
    
    let userID = args[0];
    
    // Check if the input is a Facebook profile link
    if (userID.includes('facebook.com') || userID.includes('fb.com')) {
      try {
        // Send a loading message
        api.sendMessage('⏳ Fetching user ID from the link...', threadID, messageID);
        
        // Call the API to get UID from the link
        const response = await fetch(`https://priyanshuapi.xyz/getUid?link=${encodeURIComponent(userID)}&apikey=priyansh-here`);
        const data = await response.json();
        
        if (data.error) {
          return api.sendMessage(`❌ Error: ${data.error}`, threadID, messageID);
        }
        
        if (data.id) {
          userID = data.id;
        } else {
          return api.sendMessage('❌ Could not extract user ID from the provided link.', threadID, messageID);
        }
      } catch (error) {
        global.logger.error('Error fetching UID from link:', error);
        return api.sendMessage('❌ An error occurred while fetching the user ID.', threadID, messageID);
      }
    }
    
    // Try to add the user to the group
    try {
      api.sendMessage(`⏳ Attempting to add user ${userID} to the group...`, threadID, messageID);
      
      api.addUserToGroup(userID, threadID, async (err) => {
        if (err) {
          global.logger.error('Error adding user to group:', err);
          return api.sendMessage(
            '❌ Failed to add user to the group. Possible reasons:\n' +
            '- Invalid user ID\n' +
            '- User has restricted who can add them to groups\n' +
            '- Bot does not have permission to add users\n' +
            '- User has blocked the bot',
            threadID, messageID
          );
        }
        
        // Success message
        api.sendMessage(`✅ Successfully added user to the group!`, threadID);
        
        // Get thread info to get full user details (gender, vanity, isBirthday)
        try {
          // Wait a bit for user to be added to thread
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const threadInfo = await new Promise((resolve, reject) => {
            api.getThreadInfo(threadID, (err, info) => {
              if (err) return reject(err);
              resolve(info);
            });
          });
          
          // Find user in threadInfo
          let userInfo = null;
          if (threadInfo && threadInfo.userInfo && Array.isArray(threadInfo.userInfo)) {
            userInfo = threadInfo.userInfo.find(u => u.id === userID);
          }
          
          // Get nickname from threadInfo if available
          const nickname = threadInfo?.nicknames?.[userID] || null;
          
          // Update thread in database using thread controller with full info
          await global.controllers.thread.addUserToThread(
            threadID,
            userID,
            userInfo?.name || 'Facebook User',
            nickname,
            userInfo?.gender || null,
            userInfo?.vanity && userInfo.vanity.trim() !== '' ? userInfo.vanity : null
          );
          
          global.logger.database(`Added user ${userInfo?.name || 'Facebook User'} (${userID}) to thread ${threadID} using thread controller`);
        } catch (dbError) {
          global.logger.error(`Error updating database after adding user to group:`, dbError.message);
        }
      });
    } catch (error) {
      global.logger.error('Error in adduser command:', error);
      return api.sendMessage('❌ An error occurred while executing the command.', threadID, messageID);
    }
  }
};