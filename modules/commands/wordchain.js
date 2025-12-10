/**
 * Word Chain Game Command
 * A word chain game where each player must start with the last letter of the previous word
 */

module.exports = {
  config: {
    name: 'wordchain',
    aliases: ['wc', 'wordgame'],
    description: 'Play a word chain game in the group',
    usage: '{prefix}wordchain [start/stop]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'GAME'
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
    
    try {
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Initialize word chain games if not exists
      if (!global.client.wordChainGames) {
        global.client.wordChainGames = new Map();
      }
      
      // Check if args are provided
      if (args.length === 0) {
        return api.sendMessage(
          `🎮 𝐖𝐨𝐫𝐝 𝐂𝐡𝐚𝐢𝐧 𝐆𝐚𝐦𝐞\n\n` +
          `How to play:\n` +
          `1. Start a game: ${global.config.prefix}wordchain start\n` +
          `2. Each player must say a word that starts with the last letter of the previous word\n` +
          `3. No repeating words allowed\n` +
          `4. If you can't think of a word or take too long, you lose\n` +
          `5. Stop the game: ${global.config.prefix}wordchain stop\n\n` +
          `Example: apple → elephant → tiger → rabbit...`,
          threadID,
          messageID
        );
      }
      
      const action = args[0].toLowerCase();
      
      // Start a new game
      if (action === 'start') {
        // Check if there's already an active game in this thread
        if (global.client.wordChainGames.has(threadID)) {
          return api.sendMessage(
            '❌ There is already an active Word Chain game in this thread.',
            threadID,
            messageID
          );
        }
        
        // Create a new game
      const newGame = {
        threadID,
        startedBy: senderID,
        startedByName: user.name,
        players: new Map(),
        words: [],
        lastWord: '',
        lastPlayer: '',
        timestamp: Date.now(),
        timeLimit: 60000, // 60 seconds to respond
        timer: null
      };
      
        
        // Add the starter as the first player
        newGame.players.set(senderID, {
          id: senderID,
          name: user.name,
          score: 0
        });
        
        // Store the game
        global.client.wordChainGames.set(threadID, newGame);
        
        // Send game start message
        await api.sendMessage(
          {
            body: `🎮 𝐖𝐨𝐫𝐝 𝐂𝐡𝐚𝐢𝐧 𝐆𝐚𝐦𝐞 𝐒𝐭𝐚𝐫𝐭𝐞𝐝!\n\n` +
                  `${user.name} has started a Word Chain game!\n\n` +
                  `Rules:\n` +
                  `1. Say a word that starts with the last letter of the previous word\n` +
                  `2. No repeating words\n` +
                  `3. You have 60 seconds to respond\n\n` +
                  `${user.name}, start by saying any word!`,
            mentions: [{ tag: `${user.name}`, id: senderID }]
          },
          threadID
        );
        
        return;
      }
      
      // Stop the game
      if (action === 'stop') {
        // Check if there's an active game
        if (!global.client.wordChainGames.has(threadID)) {
          return api.sendMessage(
            '❌ There is no active Word Chain game in this thread.',
            threadID,
            messageID
          );
        }
        
        const game = global.client.wordChainGames.get(threadID);
        
        // Check if the user is the game starter or an admin
        if (senderID !== game.startedBy && !global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
          return api.sendMessage(
            '❌ Only the game starter or an admin can stop the game.',
            threadID,
            messageID
          );
        }
        
        // Clear the timer if exists
        if (game.timer) {
          clearTimeout(game.timer);
        }
        
        // Generate game summary
        let summary = `🎮 𝐖𝐨𝐫𝐝 𝐂𝐡𝐚𝐢𝐧 𝐆𝐚𝐦𝐞 𝐄𝐧𝐝𝐞𝐝!\n\n`;
        
        // Add words played
        if (game.words.length > 0) {
          summary += `Words played (${game.words.length}): ${game.words.join(' → ')}\n\n`;
        } else {
          summary += `No words were played.\n\n`;
        }
        
        // Add player scores
        if (game.players.size > 0) {
          summary += `Player scores:\n`;
          
          // Convert to array and sort by score
          const players = Array.from(game.players.values())
            .sort((a, b) => b.score - a.score);
          
          for (const player of players) {
            summary += `${player.name}: ${player.score} points\n`;
          }
          
          // Award coins to the winner if there is one
          if (players.length > 0 && players[0].score > 0) {
            const winner = players[0];
            const winAmount = 1000;
            
            // Get winner's currency
            let winnerCurrency = await global.Currency.findOne({ userID: winner.id });
            if (!winnerCurrency) {
              // Create new currency record if not exists
              winnerCurrency = new global.Currency({
                userID: winner.id,
                money: 0,
                exp: 0,
                level: 1
              });
            }
            
            // Award coins
            winnerCurrency.money += winAmount;
            await winnerCurrency.save();
            
            summary += `\n🎉 ${winner.name} wins and earns ${winAmount} coins!\n`;
            summary += `💰 New balance: ${winnerCurrency.money} coins`;
          }
        }
        
        // Create mentions array
        const mentions = Array.from(game.players.values()).map(player => ({
          tag: `@${player.name}`,
          id: player.id
        }));
        
        // Remove the game
        global.client.wordChainGames.delete(threadID);
        
        // Send game end message
        return api.sendMessage(
          {
            body: summary,
            mentions
          },
          threadID
        );
      }
      
    } catch (error) {
      global.logger.error('Error in wordchain command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  
  /**
   * Handle messages for the word chain game (for backward compatibility)
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  handleEvent: async function({ api, message }) {
    const { body, threadID, senderID } = message;
    
    try {
      // Check if there's an active game in this thread
      if (!global.client.wordChainGames || !global.client.wordChainGames.has(threadID)) return;
      
      // Ignore command messages
      if (body.startsWith(global.config.prefix)) return;
      
      const game = global.client.wordChainGames.get(threadID);
      
      // Get the word (remove spaces, special characters, and convert to lowercase)
      const word = body.trim().toLowerCase().replace(/[^a-z]/g, '');
      
      // Process the word submission
      this.processWordSubmission(api, message, game, threadID, word);
    } catch (error) {
      global.logger.error('Error handling wordchain event:', error.message);
    }
  },
  
  /**
   * Process a word submission for the game
   * @param {Object} api - Facebook API instance
   * @param {Object} message - Message object
   * @param {Object} game - The current game state
   * @param {string} gameID - The game ID
   * @param {string} word - The submitted word
   */
  processWordSubmission: async function(api, message, game, gameID, word) {
    const { threadID, senderID } = message;
    
    try {
      // Ignore empty or invalid words
      if (!word || word.length < 2) return;
      
      // Prevent multiple processing of same message
      const messageKey = `${senderID}_${word}_${Date.now()}`;
      if (!game.processedMessages) {
        game.processedMessages = new Set();
      }
      
      // Check if we've already processed this exact word from this user recently
      const recentProcessed = Array.from(game.processedMessages).some(key => 
        key.startsWith(`${senderID}_${word}_`) && 
        (Date.now() - parseInt(key.split('_')[2])) < 1000 // Within 1 second
      );
      
      if (recentProcessed) return;
      
      // Add to processed messages
      game.processedMessages.add(messageKey);
      
      // Clean up old processed messages (older than 5 seconds)
      const now = Date.now();
      for (const key of game.processedMessages) {
        const timestamp = parseInt(key.split('_')[2]);
        if (now - timestamp > 5000) {
          game.processedMessages.delete(key);
        }
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) return;
      
      // Add player to the game if not already in
      if (!game.players.has(senderID)) {
        game.players.set(senderID, {
          id: senderID,
          name: user.name,
          score: 0
        });
      }
      
      // If this is the first word
      if (game.words.length === 0) {
        // Update game state
        game.words.push(word);
        game.lastWord = word;
        game.lastPlayer = senderID;
        
        // Update player score
        const player = game.players.get(senderID);
        player.score += word.length;
        game.players.set(senderID, player);
        
        // Save updated game state
        global.client.wordChainGames.set(gameID, game);
        
        // Clear previous timer if exists
        if (game.timer) {
          clearTimeout(game.timer);
        }
        
        // Set timer for next player
        game.timer = setTimeout(() => {
          // Game over due to time limit
          const lastPlayer = game.players.get(game.lastPlayer);
          
          api.sendMessage(
            {
              body: `⏰ Time's up! No one responded within 60 seconds.\n\n` +
                    `🎮 𝐖𝐨𝐫𝐝 𝐂𝐡𝐚𝐢𝐧 𝐆𝐚𝐦𝐞 𝐄𝐧𝐝𝐞𝐝!\n\n` +
                    `Last word: ${game.lastWord}\n` +
                    `Last player: ${lastPlayer.name}\n\n` +
                    `Use ${global.config.prefix}wordchain start to play again.`,
              mentions: [{ tag: `${lastPlayer.name}`, id: lastPlayer.id }]
            },
            threadID
          );
          
          // Remove the game
          global.client.wordChainGames.delete(gameID);
        }, game.timeLimit);
        
        // Send confirmation message
        api.sendMessage(
          {
            body: `${user.name} starts with "${word}"!\n\n` +
                  `Next player must say a word that starts with "${word.charAt(word.length - 1)}".`,
            mentions: [{ tag: `${user.name}`, id: senderID }]
          },
          threadID
        );

        return;
      }
      
      // Check if it's the same player
      if (senderID === game.lastPlayer) {
        return api.sendMessage(
          {
            body: `❌ ${user.name}, you can't play twice in a row. Wait for someone else to respond.`,
            mentions: [{ tag: `${user.name}`, id: senderID }]
          },
          threadID
        );
      }
      
      // Check if the word starts with the last letter of the previous word
      const lastLetter = game.lastWord.charAt(game.lastWord.length - 1);
      if (word.charAt(0) !== lastLetter) {
        return api.sendMessage(
          {
            body: `❌ ${user.name}, your word must start with the letter "${lastLetter}".\n` +
                  `Last word: ${game.lastWord}`,
            mentions: [{ tag: `${user.name}`, id: senderID }]
          },
          threadID
        );
      }
      
      // Check if the word has been used before
      if (game.words.includes(word)) {
        return api.sendMessage(
          {
            body: `❌ ${user.name}, the word "${word}" has already been used.\n` +
                  `Try another word that starts with "${lastLetter}".`,
            mentions: [{ tag: `${user.name}`, id: senderID }]
          },
          threadID
        );
      }
      
      // Valid move - update game state
      game.words.push(word);
      game.lastWord = word;
      game.lastPlayer = senderID;
      
      // Update player score
      const player = game.players.get(senderID);
      player.score += word.length;
      game.players.set(senderID, player);
      
      // Save updated game state
      global.client.wordChainGames.set(gameID, game);
      
      // Clear previous timer
      if (game.timer) {
        clearTimeout(game.timer);
      }
      
      // Set timer for next player
      game.timer = setTimeout(() => {
        // Game over due to time limit
        const lastPlayer = game.players.get(game.lastPlayer);
        
        api.sendMessage(
          {
            body: `⏰ Time's up! No one responded within 60 seconds.\n\n` +
                  `🎮 𝐖𝐨𝐫𝐝 𝐂𝐡𝐚𝐢𝐧 𝐆𝐚𝐦𝐞 𝐄𝐧𝐝𝐞𝐝!\n\n` +
                  `Last word: ${game.lastWord}\n` +
                  `Last player: ${lastPlayer.name}\n\n` +
                  `Use ${global.config.prefix}wordchain start to play again.`,
            mentions: [{ tag: `${lastPlayer.name}`, id: lastPlayer.id }]
          },
          threadID
        );
        
        // Remove the game
        global.client.wordChainGames.delete(gameID);
      }, game.timeLimit);
      
      // Send confirmation message
      return api.sendMessage(
        {
          body: `${user.name} plays "${word}"! (+${word.length} points)\n\n` +
                `Next player must say a word that starts with "${word.charAt(word.length - 1)}".`,
          mentions: [{ tag: `${user.name}`, id: senderID }]
        },
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error handling wordchain event:', error.message);
    }
  }
};