/**
 * Stickers Command
 * Search and send stickers using the new Stickers API
 * Features: search stickers, list packs, get stickers in a pack, AI stickers
 */

module.exports = {
  config: {
    name: 'sticker',
    aliases: ['stickers', 'stickersearch', 'stickerpack'],
    description: 'Search and manage Facebook stickers',
    usage: '{prefix}sticker <search/packs/pack/ai> <query/packID>',
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
    const { threadID, messageID } = message;
    
    // Check if stickers API is available
    if (!api.stickers) {
      return api.sendMessage('❌ Stickers API is not available. Please check if stickers.js exists in fca-updated/src/', threadID, messageID);
    }
    
    // Show help if no arguments
    if (args.length === 0) {
      const helpMessage = `🎨 Stickers Command Help\n\n` +
        `📌 Usage:\n` +
        `/sticker search <query> - Search for stickers\n` +
        `/sticker packs - List your sticker packs\n` +
        `/sticker pack <packID> - Get stickers in a pack\n` +
        `/sticker ai - Get AI-generated stickers\n` +
        `/sticker store - List all store packs\n\n` +
        `💡 Examples:\n` +
        `/sticker search love\n` +
        `/sticker packs\n` +
        `/sticker ai`;
      
      return api.sendMessage(helpMessage, threadID, messageID);
    }
    
    const action = args[0].toLowerCase();
    
    try {
      switch (action) {
        case 'search': {
          const query = args.slice(1).join(' ');
          if (!query) {
            return api.sendMessage('❌ Please provide a search query.\nExample: /sticker search love', threadID, messageID);
          }
          
          api.sendMessage('🔍 Searching for stickers...', threadID, messageID);
          
          api.stickers.search(query, (err, stickers) => {
            if (err) {
              global.logger.error('Stickers search error:', err);
              return api.sendMessage('❌ Error searching for stickers: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            if (stickers.length === 0) {
              return api.sendMessage(`❌ No stickers found for "${query}"`, threadID, messageID);
            }
            
            // Format sticker results
            let resultMsg = `✅ Found ${stickers.length} sticker(s) for "${query}":\n\n`;
            
            stickers.slice(0, 5).forEach((sticker, index) => {
              resultMsg += `${index + 1}. ${sticker.label || 'Sticker'}\n`;
              resultMsg += `   ID: ${sticker.stickerID}\n`;
              resultMsg += `   URL: ${sticker.url}\n`;
              if (sticker.animatedUrl) {
                resultMsg += `   Animated: Yes\n`;
              }
              resultMsg += `\n`;
            });
            
            if (stickers.length > 5) {
              resultMsg += `\n... and ${stickers.length - 5} more stickers`;
            }
            
            api.sendMessage(resultMsg, threadID, messageID);
            
            // Send first sticker as example
            if (stickers[0] && stickers[0].stickerID) {
              api.sendMessage({ sticker: stickers[0].stickerID }, threadID);
            }
          });
          break;
        }
        
        case 'packs': {
          api.sendMessage('📦 Loading your sticker packs...', threadID, messageID);
          
          api.stickers.listPacks((err, packs) => {
            if (err) {
              global.logger.error('Stickers listPacks error:', err);
              return api.sendMessage('❌ Error loading sticker packs: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            if (packs.length === 0) {
              return api.sendMessage('❌ You have no sticker packs.', threadID, messageID);
            }
            
            let packsMsg = `✅ Your Sticker Packs (${packs.length}):\n\n`;
            
            packs.slice(0, 10).forEach((pack, index) => {
              packsMsg += `${index + 1}. ${pack.name}\n`;
              packsMsg += `   ID: ${pack.id}\n`;
              if (pack.thumbnail) {
                packsMsg += `   📸 Thumbnail: ${pack.thumbnail}\n`;
              }
              packsMsg += `\n`;
            });
            
            if (packs.length > 10) {
              packsMsg += `\n... and ${packs.length - 10} more packs`;
            }
            
            packsMsg += `\n💡 Use /sticker pack <packID> to see stickers in a pack`;
            
            api.sendMessage(packsMsg, threadID, messageID);
          });
          break;
        }
        
        case 'pack': {
          const packID = args[1];
          if (!packID) {
            return api.sendMessage('❌ Please provide a pack ID.\nExample: /sticker pack 123456789', threadID, messageID);
          }
          
          api.sendMessage(`📦 Loading stickers from pack ${packID}...`, threadID, messageID);
          
          api.stickers.getStickersInPack(packID, (err, stickers) => {
            if (err) {
              global.logger.error('Stickers getStickersInPack error:', err);
              return api.sendMessage('❌ Error loading pack stickers: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            if (stickers.length === 0) {
              return api.sendMessage(`❌ No stickers found in pack ${packID}`, threadID, messageID);
            }
            
            let packMsg = `✅ Found ${stickers.length} sticker(s) in pack:\n\n`;
            
            stickers.slice(0, 5).forEach((sticker, index) => {
              packMsg += `${index + 1}. ${sticker.label || 'Sticker'}\n`;
              packMsg += `   ID: ${sticker.stickerID}\n`;
            });
            
            if (stickers.length > 5) {
              packMsg += `\n... and ${stickers.length - 5} more stickers`;
            }
            
            api.sendMessage(packMsg, threadID, messageID);
            
            // Send first 3 stickers as examples
            for (let i = 0; i < Math.min(3, stickers.length); i++) {
              if (stickers[i] && stickers[i].stickerID) {
                api.sendMessage({ sticker: stickers[i].stickerID }, threadID);
              }
            }
          });
          break;
        }
        
        case 'ai': {
          api.sendMessage('🤖 Loading AI-generated stickers...', threadID, messageID);
          
          api.stickers.getAiStickers({ limit: 10 }, (err, stickers) => {
            if (err) {
              global.logger.error('Stickers getAiStickers error:', err);
              return api.sendMessage('❌ Error loading AI stickers: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            if (stickers.length === 0) {
              return api.sendMessage('❌ No AI stickers available right now.', threadID, messageID);
            }
            
            let aiMsg = `🤖 Found ${stickers.length} AI-generated sticker(s):\n\n`;
            
            stickers.slice(0, 5).forEach((sticker, index) => {
              aiMsg += `${index + 1}. ${sticker.label || 'AI Sticker'}\n`;
              aiMsg += `   ID: ${sticker.stickerID}\n`;
            });
            
            api.sendMessage(aiMsg, threadID, messageID);
            
            // Send first 3 AI stickers as examples
            for (let i = 0; i < Math.min(3, stickers.length); i++) {
              if (stickers[i] && stickers[i].stickerID) {
                api.sendMessage({ sticker: stickers[i].stickerID }, threadID);
              }
            }
          });
          break;
        }
        
        case 'store': {
          api.sendMessage('🏪 Loading store sticker packs... (This may take a while)', threadID, messageID);
          
          api.stickers.getStorePacks((err, packs) => {
            if (err) {
              global.logger.error('Stickers getStorePacks error:', err);
              return api.sendMessage('❌ Error loading store packs: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            if (packs.length === 0) {
              return api.sendMessage('❌ No store packs available.', threadID, messageID);
            }
            
            let storeMsg = `🏪 Store Sticker Packs (${packs.length} total):\n\n`;
            
            packs.slice(0, 15).forEach((pack, index) => {
              storeMsg += `${index + 1}. ${pack.name}\n`;
              storeMsg += `   ID: ${pack.id}\n`;
            });
            
            if (packs.length > 15) {
              storeMsg += `\n... and ${packs.length - 15} more packs`;
            }
            
            storeMsg += `\n\n💡 Use /sticker pack <packID> to see stickers in a pack`;
            
            api.sendMessage(storeMsg, threadID, messageID);
          });
          break;
        }
        
        case 'add': {
          const packID = args[1];
          if (!packID) {
            return api.sendMessage('❌ Please provide a pack ID to add.\nExample: /sticker add 123456789', threadID, messageID);
          }
          
          api.sendMessage(`➕ Adding sticker pack ${packID}...`, threadID, messageID);
          
          api.stickers.addPack(packID, (err, pack) => {
            if (err) {
              global.logger.error('Stickers addPack error:', err);
              return api.sendMessage('❌ Error adding pack: ' + (err.error || err.message || 'Unknown error'), threadID, messageID);
            }
            
            api.sendMessage(`✅ Successfully added sticker pack!`, threadID, messageID);
          });
          break;
        }
        
        default: {
          return api.sendMessage(
            `❌ Unknown action: ${action}\n\n` +
            `Available actions: search, packs, pack, ai, store, add\n` +
            `Use /sticker for help`,
            threadID, messageID
          );
        }
      }
    } catch (error) {
      global.logger.error('Stickers command error:', error);
      return api.sendMessage('❌ An error occurred while executing the command: ' + error.message, threadID, messageID);
    }
  }
};
