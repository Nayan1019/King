/**
 * FB Follow Command - Follow/Unfollow Facebook users
 * @author Priyansh Rajput
 */

module.exports = {
  config: {
    name: 'fbfollow',
    aliases: ['follow', 'unfollow'],
    description: 'Follow or unfollow a Facebook user',
    usage: '{prefix}fbfollow <userID> [follow/unfollow]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'SOCIAL'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    if (!api.follow) {
      return api.sendMessage('❌ Follow API not available.', threadID, messageID);
    }
    
    if (args.length === 0) {
      return api.sendMessage(
        '📌 Usage:\n' +
        '/fbfollow <userID> - Follow user\n' +
        '/fbfollow <userID> unfollow - Unfollow user',
        threadID, messageID
      );
    }
    
    const userID = args[0];
    const shouldFollow = args[1] !== 'unfollow';
    
    api.sendTypingIndicator(threadID);
    
    api.sendMessage(`⏳ ${shouldFollow ? 'Following' : 'Unfollowing'} user...`, threadID, (err, info) => {
      if (err) return;
      
      api.sendTypingIndicator(threadID);
      
      api.follow(userID, shouldFollow, (err, result) => {
        if (err) {
          return api.editMessage('❌ Failed. Check user ID.', info.messageID);
        }
        
        api.editMessage(
          `✅ ${shouldFollow ? 'Followed' : 'Unfollowed'} successfully!\n\n` +
          `👤 User ID: ${userID}`,
          info.messageID
        );
      });
    });
  }
};
