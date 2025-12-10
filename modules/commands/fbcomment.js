/**
 * FB Comment Command
 * Post comments on Facebook posts
 * 
 * @author Priyansh Rajput
 */

module.exports = {
  config: {
    name: 'fbcomment',
    aliases: ['postcomment', 'comment'],
    description: 'Post a comment on a Facebook post',
    usage: '{prefix}fbcomment <postID> <message>',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
    category: 'SOCIAL'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    if (!api.comment) {
      return api.sendMessage('❌ Comment API not available.', threadID, messageID);
    }
    
    if (args.length < 2) {
      return api.sendMessage(
        '📝 Usage: /fbcomment <postID> <message>\n\n' +
        'Example: /fbcomment 123456789 Nice post!',
        threadID, messageID
      );
    }
    
    const postID = args[0];
    const commentText = args.slice(1).join(' ');
    
    api.sendTypingIndicator(threadID);
    
    api.sendMessage('⏳ Posting comment...', threadID, (err, info) => {
      if (err) return;
      
      const sentMessageID = info.messageID;
      api.sendTypingIndicator(threadID);
      
      api.comment(commentText, postID, (err, result) => {
        if (err) {
          global.logger.error('FB Comment error:', err);
          return api.editMessage(
            '❌ Failed to post comment.\n' +
            'Check if post ID is valid.',
            sentMessageID
          );
        }
        
        api.editMessage(
          `✅ Comment posted successfully!\n\n` +
          `📝 Post ID: ${postID}\n` +
          `💬 Comment ID: ${result.id}\n` +
          `🔗 URL: ${result.url || 'N/A'}`,
          sentMessageID
        );
      });
    });
  }
};
