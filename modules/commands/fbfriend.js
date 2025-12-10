/**
 * FB Friend Command - Manage Facebook friends
 * @author Priyansh Rajput
 */

module.exports = {
  config: {
    name: 'fbfriend',
    aliases: ['friend', 'friendrequest'],
    description: 'Manage Facebook friend requests and suggestions',
    usage: '{prefix}fbfriend <requests/accept/list/suggest/send> [userID]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 10,
    category: 'SOCIAL'
  },
  
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    if (!api.friend) {
      return api.sendMessage('❌ Friend API not available.', threadID, messageID);
    }
    
    if (args.length === 0) {
      return api.sendMessage(
        '👥 Friend Command:\n\n' +
        '/fbfriend requests - View friend requests\n' +
        '/fbfriend accept <userID> - Accept request\n' +
        '/fbfriend list - View your friends\n' +
        '/fbfriend suggest - Get suggestions\n' +
        '/fbfriend send <userID> - Send request',
        threadID, messageID
      );
    }
    
    const action = args[0].toLowerCase();
    api.sendTypingIndicator(threadID);
    
    switch (action) {
      case 'requests':
        api.sendMessage('⏳ Loading friend requests...', threadID, (err, info) => {
          if (err) return;
          api.sendTypingIndicator(threadID);
          
          api.friend.requests((err, requests) => {
            if (err) {
              return api.editMessage('❌ Failed to load requests.', info.messageID);
            }
            
            if (requests.length === 0) {
              return api.editMessage('📭 No pending friend requests.', info.messageID);
            }
            
            let msg = `📬 Friend Requests (${requests.length}):\n\n`;
            requests.slice(0, 10).forEach((req, i) => {
              msg += `${i + 1}. ${req.name}\n   ID: ${req.userID}\n\n`;
            });
            
            if (requests.length > 10) msg += `... and ${requests.length - 10} more`;
            
            api.editMessage(msg, info.messageID);
          });
        });
        break;
        
      case 'accept':
        if (!args[1]) {
          return api.sendMessage('❌ Provide user ID: /fbfriend accept <userID>', threadID, messageID);
        }
        
        api.sendMessage('⏳ Accepting request...', threadID, (err, info) => {
          if (err) return;
          api.sendTypingIndicator(threadID);
          
          api.friend.accept(args[1], (err) => {
            if (err) {
              return api.editMessage('❌ Failed to accept.', info.messageID);
            }
            api.editMessage(`✅ Accepted friend request!\n\n👤 User: ${args[1]}`, info.messageID);
          });
        });
        break;
        
      case 'list':
        api.sendMessage('⏳ Loading friends...', threadID, (err, info) => {
          if (err) return;
          api.sendTypingIndicator(threadID);
          
          api.friend.list((err, friends) => {
            if (err) {
              return api.editMessage('❌ Failed to load friends.', info.messageID);
            }
            
            let msg = `👥 Your Friends (${friends.length}):\n\n`;
            friends.slice(0, 15).forEach((f, i) => {
              msg += `${i + 1}. ${f.name}\n`;
            });
            
            if (friends.length > 15) msg += `\n... and ${friends.length - 15} more`;
            
            api.editMessage(msg, info.messageID);
          });
        });
        break;
        
      case 'suggest':
        api.sendMessage('⏳ Getting suggestions...', threadID, (err, info) => {
          if (err) return;
          api.sendTypingIndicator(threadID);
          
          api.friend.suggest.list(20, (err, suggestions) => {
            if (err) {
              return api.editMessage('❌ Failed to get suggestions.', info.messageID);
            }
            
            let msg = `✨ Friend Suggestions (${suggestions.length}):\n\n`;
            suggestions.slice(0, 10).forEach((s, i) => {
              msg += `${i + 1}. ${s.name}\n   ID: ${s.userID}\n\n`;
            });
            
            api.editMessage(msg, info.messageID);
          });
        });
        break;
        
      case 'send':
        if (!args[1]) {
          return api.sendMessage('❌ Provide user ID: /fbfriend send <userID>', threadID, messageID);
        }
        
        api.sendMessage('⏳ Sending friend request...', threadID, (err, info) => {
          if (err) return;
          api.sendTypingIndicator(threadID);
          
          api.friend.suggest.request(args[1], (err) => {
            if (err) {
              return api.editMessage('❌ Failed to send request.', info.messageID);
            }
            api.editMessage(`✅ Friend request sent!\n\n👤 User: ${args[1]}`, info.messageID);
          });
        });
        break;
        
      default:
        api.sendMessage('❌ Invalid action. Use: requests, accept, list, suggest, send', threadID, messageID);
    }
  }
};
