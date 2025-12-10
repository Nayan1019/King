/**
 * FB Story Command - Create and interact with Facebook Stories
 * @author Priyansh Rajput
 */

module.exports = {
  config: {
    name: 'fbstory',
    aliases: ['story', 'createstory'],
    description: 'Create stories, react to stories, reply to stories',
    usage: '{prefix}fbstory <create/react/reply> <text/storyID> [message]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 15,
    category: 'SOCIAL'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    if (!api.story) {
      return api.sendMessage('❌ Story API not available.', threadID, messageID);
    }
    
    if (args.length === 0) {
      return api.sendMessage(
        '📖 Story Command:\n\n' +
        '/fbstory create <text> - Create text story\n' +
        '/fbstory react <storyID> <emoji> - React to story\n' +
        '/fbstory reply <storyID> <message> - Reply to story\n\n' +
        'Allowed reactions: ❤️ 👍 🤗 😆 😡 😢 😮',
        threadID, messageID
      );
    }
    
    const action = args[0].toLowerCase();
    api.sendTypingIndicator(threadID);
    
    switch (action) {
      case 'create':
        if (args.length < 2) {
          return api.sendMessage('❌ Provide text: /fbstory create <text>', threadID, messageID);
        }
        
        const storyText = args.slice(1).join(' ');
        
        api.sendMessage('⏳ Creating story...', threadID, (err, info) => {
          if (err) return;
          
          api.sendTypingIndicator(threadID);
          
          api.story.create(storyText, (err, result) => {
            if (err) {
              return api.editMessage('❌ Failed to create story.', info.messageID);
            }
            
            api.editMessage(
              `✅ Story created successfully!\n\n` +
              `📖 Story ID: ${result.storyID}\n` +
              `💬 Text: ${storyText.substring(0, 50)}${storyText.length > 50 ? '...' : ''}`,
              info.messageID
            );
          });
        });
        break;
        
      case 'react':
        if (args.length < 3) {
          return api.sendMessage(
            '❌ Usage: /fbstory react <storyID> <emoji>\n' +
            'Allowed: ❤️ 👍 🤗 😆 😡 😢 😮',
            threadID, messageID
          );
        }
        
        const storyID = args[1];
        const reaction = args[2];
        
        api.sendMessage('⏳ Reacting to story...', threadID, (err, info) => {
          if (err) return;
          
          api.sendTypingIndicator(threadID);
          
          api.story.react(storyID, reaction, (err, result) => {
            if (err) {
              return api.editMessage(
                '❌ Failed to react.\n' +
                'Check story ID and use valid emoji.',
                info.messageID
              );
            }
            
            api.editMessage(
              `✅ Reacted to story!\n\n` +
              `📖 Story: ${storyID}\n` +
              `${reaction} Reaction sent!`,
              info.messageID
            );
          });
        });
        break;
        
      case 'reply':
        if (args.length < 3) {
          return api.sendMessage('❌ Usage: /fbstory reply <storyID> <message>', threadID, messageID);
        }
        
        const targetStoryID = args[1];
        const replyText = args.slice(2).join(' ');
        
        api.sendMessage('⏳ Replying to story...', threadID, (err, info) => {
          if (err) return;
          
          api.sendTypingIndicator(threadID);
          
          api.story.msg(targetStoryID, replyText, (err, result) => {
            if (err) {
              return api.editMessage('❌ Failed to reply. Check story ID.', info.messageID);
            }
            
            api.editMessage(
              `✅ Replied to story!\n\n` +
              `📖 Story: ${targetStoryID}\n` +
              `💬 Message: ${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}`,
              info.messageID
            );
          });
        });
        break;
        
      default:
        api.sendMessage('❌ Invalid action. Use: create, react, or reply', threadID, messageID);
    }
  }
};
