/**
 * Guess the Number Game Command
 * Allows users to play a number guessing game in the group
 */

module.exports = {
  config: {
    name: 'guessnumber',
    aliases: ['gtn', 'guess'],
    description: 'Play a "Guess the Number" game',
    usage: '{prefix}guessnumber',
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
   */
  run: async function({ api, message }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Initialize game data if not already present
      if (!global.client.guessGames) {
        global.client.guessGames = new Map();
      }
      
      // Check if there's already an active game in this thread
      if (global.client.guessGames.has(threadID)) {
        return api.sendMessage('❌ A game is already active in this thread. Please finish the current game first.', threadID, messageID);
      }
      
      // Generate a random number between 1 and 100
      const targetNumber = Math.floor(Math.random() * 100) + 1;
      
      // Store game data
      global.client.guessGames.set(threadID, {
        targetNumber,
        attempts: [],
        player: senderID,
        processedMessages: new Set()
      });
      
      // Send game start message
      await api.sendMessage(
        '🎲 Guess the Number Game Started!\n' +
        'I have picked a number between 1 and 100.\n' +
        'Try to guess it by typing a number!',
        threadID
      );
      
    } catch (error) {
      global.logger.error('Error in guessnumber command:', error.message);
      return api.sendMessage('❌ An error occurred while starting the game.', threadID, messageID);
    }
  },

  /**
   * Handle messages for the guess number game
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  handleEvent: async function({ api, message }) {
    const { body, threadID, messageID, senderID } = message;
    
    try {
      // Check if there's an active game in this thread
      if (!global.client.guessGames || !global.client.guessGames.has(threadID)) return;
      
      // Ignore command messages
      if (body.startsWith(global.config.prefix)) return;
      
      // Retrieve the game data
      const game = global.client.guessGames.get(threadID);
      if (!game) return;
      
      // Parse the message to see if it's a number
      const guess = parseInt(body.trim());
      if (isNaN(guess) || guess < 1 || guess > 100) {
        return; // Silently ignore invalid numbers
      }
      
      // Prevent multiple processing of same message
      const messageKey = `${senderID}_${guess}_${Date.now()}`;
      if (!game.processedMessages) {
        game.processedMessages = new Set();
      }
      
      // Check if we've already processed this exact guess from this user recently
      const recentProcessed = Array.from(game.processedMessages).some(key => 
        key.startsWith(`${senderID}_${guess}_`) && 
        (Date.now() - parseInt(key.split('_')[2])) < 2000 // Within 2 seconds
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
      
      // Check if it's the correct player's turn
      if (game.player !== senderID) {
        return api.sendMessage('❌ It is not your turn to guess.', threadID, messageID);
      }
      
      // Add the guess to the attempts
      game.attempts.push(guess);
      
      if (guess === game.targetNumber) {
        // Correct guess - award coins
        const winAmount = 500;
        let userCurrency = await global.Currency.findOne({ userID: senderID });
        
        if (!userCurrency) {
          // Create new currency record if not exists
          userCurrency = new global.Currency({
            userID: senderID,
            money: 0,
            exp: 0,
            level: 1
          });
        }
        
        userCurrency.money += winAmount;
        await userCurrency.save();
        
        api.sendMessage(
          `🎉 Congratulations! You've guessed the correct number: ${game.targetNumber}!\n` +
          `It took you ${game.attempts.length} attempts.\n` +
          `You earned ${winAmount} coins! 💰\n` +
          `New balance: ${userCurrency.money} coins`,
          threadID,
          messageID
        );
        
        // Remove the game
        global.client.guessGames.delete(threadID);
      } else if (guess < game.targetNumber) {
        api.sendMessage('🔼 Too low! Try a higher number.', threadID, messageID);
      } else {
        api.sendMessage('🔽 Too high! Try a lower number.', threadID, messageID);
      }
      
    } catch (error) {
      global.logger.error('Error handling guessnumber event:', error.message);
    }
  }
};

