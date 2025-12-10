/**
 * Notes Command
 * Manage Facebook Messenger Notes (24-hour status messages)
 * Features: create, delete, check, update notes with typing indicators and message editing
 */

module.exports = {
  config: {
    name: 'note',
    aliases: ['notes', 'mynote'],
    description: 'Manage your Messenger notes (24-hour status)',
    usage: '{prefix}note <create/check/delete/update> [text]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
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
    
    // Check if notes API is available
    if (!api.notes) {
      return api.sendMessage('❌ Notes API is not available. Please check if notes.js exists in fca-updated/src/', threadID, messageID);
    }
    
    // Show help if no arguments
    if (args.length === 0) {
      const helpMessage = `📝 Notes Command Help\n\n` +
        `📌 Usage:\n` +
        `/note create <text> - Create a new note (24h)\n` +
        `/note check - Check your current note\n` +
        `/note delete - Delete your current note\n` +
        `/note update <text> - Update your current note\n\n` +
        `🔒 Privacy:\n` +
        `/note create <text> everyone - Visible to everyone\n` +
        `/note create <text> friends - Visible to friends only\n\n` +
        `💡 Examples:\n` +
        `/note create Busy in meeting 📵\n` +
        `/note create Sleeping 😴 friends\n` +
        `/note check\n` +
        `/note update Back online! 🚀`;
      
      return api.sendMessage(helpMessage, threadID, messageID);
    }
    
    const action = args[0].toLowerCase();
    
    // Send typing indicator
    api.sendTypingIndicator(threadID);
    
    try {
      switch (action) {
        case 'create': {
          const text = args.slice(1).join(' ');
          if (!text) {
            return api.sendMessage('❌ Please provide text for the note.\nExample: /note create Busy in meeting 📵', threadID, messageID);
          }
          
          // Check if last word is privacy setting
          const words = text.split(' ');
          const lastWord = words[words.length - 1].toLowerCase();
          let privacy = 'EVERYONE';
          let noteText = text;
          
          if (lastWord === 'everyone' || lastWord === 'friends') {
            privacy = lastWord.toUpperCase();
            noteText = words.slice(0, -1).join(' ');
          }
          
          // Send initial message
          api.sendMessage('⏳ Creating your note...', threadID, (err, info) => {
            if (err) {
              global.logger.error('Notes create message error:', err);
              return;
            }
            
            const sentMessageID = info.messageID;
            
            // Send typing indicator again
            api.sendTypingIndicator(threadID);
            
            // Create note
            api.notes.create(noteText, privacy, (err, status) => {
              if (err) {
                global.logger.error('Notes create error:', err);
                
                // Edit message to show error
                api.editMessage(
                  '❌ Failed to create note. Possible reasons:\n' +
                  '- Network issue\n' +
                  '- Facebook API error\n' +
                  '- Already have an active note\n\n' +
                  '💡 Tip: Try checking and deleting your current note first',
                  sentMessageID
                );
                return;
              }
              
              // Edit message to show success
              const successMsg = `✅ Note created successfully!\n\n` +
                `📝 Text: ${noteText}\n` +
                `🔒 Privacy: ${privacy}\n` +
                `⏰ Duration: 24 hours\n` +
                `🆔 Note ID: ${status.id || 'N/A'}\n\n` +
                `💡 Your note is now visible in Messenger!`;
              
              api.editMessage(successMsg, sentMessageID);
              
              global.logger.system(`✅ Note created for user ${senderID}`);
            });
          });
          break;
        }
        
        case 'check': {
          // Send initial message
          api.sendMessage('⏳ Checking your current note...', threadID, (err, info) => {
            if (err) {
              global.logger.error('Notes check message error:', err);
              return;
            }
            
            const sentMessageID = info.messageID;
            
            // Send typing indicator
            api.sendTypingIndicator(threadID);
            
            // Check note
            api.notes.check((err, currentNote) => {
              if (err) {
                global.logger.error('Notes check error:', err);
                
                // Edit message to show error
                api.editMessage(
                  '❌ Failed to check note. Please try again.',
                  sentMessageID
                );
                return;
              }
              
              if (!currentNote || !currentNote.id) {
                // Edit message - no active note
                api.editMessage(
                  '📝 You don\'t have any active note right now.\n\n' +
                  '💡 Create one with: /note create <text>',
                  sentMessageID
                );
                return;
              }
              
              // Edit message with note details
              const noteMsg = `✅ Your Current Note:\n\n` +
                `📝 Text: ${currentNote.description || 'N/A'}\n` +
                `🆔 Note ID: ${currentNote.id}\n` +
                `⏰ Created: ${currentNote.created_time ? new Date(currentNote.created_time * 1000).toLocaleString() : 'N/A'}\n` +
                `⌛ Expires: ${currentNote.expiration_time ? new Date(currentNote.expiration_time * 1000).toLocaleString() : 'N/A'}\n\n` +
                `💡 Delete with: /note delete`;
              
              api.editMessage(noteMsg, sentMessageID);
            });
          });
          break;
        }
        
        case 'delete': {
          // First check for current note
          api.sendMessage('⏳ Checking for active note...', threadID, (err, info) => {
            if (err) {
              global.logger.error('Notes delete message error:', err);
              return;
            }
            
            const sentMessageID = info.messageID;
            
            // Send typing indicator
            api.sendTypingIndicator(threadID);
            
            api.notes.check((err, currentNote) => {
              if (err) {
                global.logger.error('Notes check error:', err);
                api.editMessage('❌ Failed to check for active note.', sentMessageID);
                return;
              }
              
              if (!currentNote || !currentNote.id) {
                api.editMessage(
                  '📝 You don\'t have any active note to delete.\n\n' +
                  '💡 Create one with: /note create <text>',
                  sentMessageID
                );
                return;
              }
              
              // Update message
              api.editMessage('⏳ Deleting your note...', sentMessageID);
              
              // Send typing indicator
              api.sendTypingIndicator(threadID);
              
              // Delete note
              api.notes.delete(currentNote.id, (err, deletedStatus) => {
                if (err) {
                  global.logger.error('Notes delete error:', err);
                  api.editMessage('❌ Failed to delete note. Please try again.', sentMessageID);
                  return;
                }
                
                api.editMessage(
                  `✅ Note deleted successfully!\n\n` +
                  `📝 Deleted note: "${currentNote.description}"\n\n` +
                  `💡 Create a new note with: /note create <text>`,
                  sentMessageID
                );
                
                global.logger.system(`✅ Note deleted for user ${senderID}`);
              });
            });
          });
          break;
        }
        
        case 'update': {
          const newText = args.slice(1).join(' ');
          if (!newText) {
            return api.sendMessage('❌ Please provide new text for the note.\nExample: /note update Back online! 🚀', threadID, messageID);
          }
          
          // Send initial message
          api.sendMessage('⏳ Checking current note...', threadID, (err, info) => {
            if (err) {
              global.logger.error('Notes update message error:', err);
              return;
            }
            
            const sentMessageID = info.messageID;
            
            // Send typing indicator
            api.sendTypingIndicator(threadID);
            
            // Check for current note
            api.notes.check((err, currentNote) => {
              if (err) {
                global.logger.error('Notes check error:', err);
                api.editMessage('❌ Failed to check for active note.', sentMessageID);
                return;
              }
              
              if (!currentNote || !currentNote.id) {
                api.editMessage(
                  '📝 You don\'t have any active note to update.\n\n' +
                  '💡 Create one with: /note create <text>',
                  sentMessageID
                );
                return;
              }
              
              // Update message
              api.editMessage('⏳ Updating your note...', sentMessageID);
              
              // Send typing indicator
              api.sendTypingIndicator(threadID);
              
              // Recreate note (delete old, create new)
              api.notes.recreate(currentNote.id, newText, (err, result) => {
                if (err) {
                  global.logger.error('Notes update error:', err);
                  api.editMessage('❌ Failed to update note. Please try again.', sentMessageID);
                  return;
                }
                
                api.editMessage(
                  `✅ Note updated successfully!\n\n` +
                  `📝 Old note: "${currentNote.description}"\n` +
                  `📝 New note: "${newText}"\n` +
                  `⏰ Duration: 24 hours\n\n` +
                  `💡 Your updated note is now visible!`,
                  sentMessageID
                );
                
                global.logger.system(`✅ Note updated for user ${senderID}`);
              });
            });
          });
          break;
        }
        
        default: {
          return api.sendMessage(
            `❌ Unknown action: ${action}\n\n` +
            `Available actions: create, check, delete, update\n` +
            `Use /note for help`,
            threadID, messageID
          );
        }
      }
    } catch (error) {
      global.logger.error('Notes command error:', error);
      return api.sendMessage('❌ An error occurred: ' + error.message, threadID, messageID);
    }
  }
};
