/**
 * Rock Paper Scissors Game Command
 * Allows users to play rock-paper-scissors in the group
 */

module.exports = {
  config: {
    name: 'rps',
    aliases: ['rockpaperscissors'],
    description: 'Play rock-paper-scissors with the bot or other users',
    usage: '{prefix}rps [rock/paper/scissors] [@mention]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 10,
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Check if args are provided
      if (args.length === 0) {
        return api.sendMessage(
          `🎮 𝐑𝐨𝐜𝐤 𝐏𝐚𝐩𝐞𝐫 𝐒𝐜𝐢𝐬𝐬𝐨𝐫𝐬\n\n` +
          `How to play:\n` +
          `1. Play against the bot: ${global.config.prefix}rps [rock/paper/scissors]\n` +
          `2. Challenge someone: ${global.config.prefix}rps [rock/paper/scissors] [@mention]\n\n` +
          `Example: ${global.config.prefix}rps rock @friend`,
          threadID,
          messageID
        );
      }
      
      // Get player's choice
      const choice = args[0].toLowerCase();
      
      // Validate choice
      if (!['rock', 'paper', 'scissors'].includes(choice)) {
        return api.sendMessage(
          `❌ Invalid choice. Please choose rock, paper, or scissors.\n` +
          `Example: ${global.config.prefix}rps rock`,
          threadID,
          messageID
        );
      }
      
      // Check if player is challenging someone
      const mentionKeys = Object.keys(mentions);
      
      if (mentionKeys.length > 0) {
        // Challenge another player
        const opponentID = mentionKeys[0];
        const opponent = await global.User.findOne({ userID: opponentID });
        
        if (!opponent) {
          return api.sendMessage('❌ Opponent data not found.', threadID, messageID);
        }
        
        // Store the challenge in global client data
        if (!global.client.rpsGames) {
          global.client.rpsGames = new Map();
        }
        
        const gameID = `${threadID}_${senderID}_${opponentID}`;
        
        global.client.rpsGames.set(gameID, {
          challenger: {
            id: senderID,
            name: user.name,
            choice
          },
          opponent: {
            id: opponentID,
            name: opponent.name,
            choice: null
          },
          threadID,
          timestamp: Date.now()
        });
        
        // Send challenge message
        const sentMessage = await api.sendMessage(
          {
            body: `🎮 𝐑𝐏𝐒 𝐂𝐡𝐚𝐥𝐥𝐞𝐧𝐠𝐞!\n\n` +
                  `@${user.name} has challenged @${opponent.name} to a game of Rock Paper Scissors!\n\n` +
                  `@${opponent.name}, reply with [rock/paper/scissors] to accept the challenge.`,
            mentions: [
              { tag: `@${user.name}`, id: senderID },
              { tag: `@${opponent.name}`, id: opponentID }
            ]
          },
          threadID,
          messageID
        );
        
        // Initialize handleReply array if it doesn't exist
        if (!global.client.handleReply) {
          global.client.handleReply = [];
        }
        
        // Add to handleReply for proper reply handling
        global.client.handleReply.push({
          name: this.config.name,
          messageID: sentMessage.messageID,
          author: senderID,
          opponent: opponentID,
          gameID: gameID,
          choice: choice
        });
        
        return;
      } else {
        // Play against the bot
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        // Determine winner
        let result;
        if (choice === botChoice) {
          result = 'tie';
        } else if (
          (choice === 'rock' && botChoice === 'scissors') ||
          (choice === 'paper' && botChoice === 'rock') ||
          (choice === 'scissors' && botChoice === 'paper')
        ) {
          result = 'win';
        } else {
          result = 'lose';
        }
        
        // Create result message
        let resultMessage = `🎮 𝐑𝐨𝐜𝐤 𝐏𝐚𝐩𝐞𝐫 𝐒𝐜𝐢𝐬𝐬𝐨𝐫𝐬\n\n`;
        resultMessage += `@${user.name}'s choice: ${getEmoji(choice)} ${choice}\n`;
        resultMessage += `Bot's choice: ${getEmoji(botChoice)} ${botChoice}\n\n`;
        
        // Add result
        if (result === 'tie') {
          resultMessage += `🤝 It's a tie!`;
        } else if (result === 'win') {
          // Get user currency
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
          
          // Award coins for winning
          const winAmount = 50;
          userCurrency.money += winAmount;
          await userCurrency.save();
          
          resultMessage += `🎉 You win! You earned ${winAmount} coins.\n`;
          resultMessage += `💰 Your balance: ${userCurrency.money} coins`;
        } else {
          resultMessage += `😢 You lose! Better luck next time.`;
        }
        
        // Send result message
        return api.sendMessage(
          {
            body: resultMessage,
            mentions: [{ tag: `@${user.name}`, id: senderID }]
          },
          threadID,
          messageID
        );
      }
      
    } catch (error) {
      global.logger.error('Error in RPS command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Handle replies to this command
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.handleReply - Reply handler data
   */
  handleReply: async function({ api, message, handleReply }) {
    const { body, threadID, messageID, senderID } = message;
    
    try {
      // Check if the reply is from the opponent
      if (senderID !== handleReply.opponent) {
        return api.sendMessage('❌ This challenge is not for you.', threadID, messageID);
      }
      
      // Check if there are any active challenges
      if (!global.client.rpsGames || global.client.rpsGames.size === 0) return;
      
      // Get the game from handleReply data
      const gameID = handleReply.gameID;
      const activeGame = global.client.rpsGames.get(gameID);
      
      if (!activeGame) {
        return api.sendMessage('❌ This challenge is no longer active.', threadID, messageID);
      }
      
      // Parse the choice
      const choice = body.toLowerCase().trim();
      if (!['rock', 'paper', 'scissors'].includes(choice)) {
        return api.sendMessage(
          '❌ Invalid choice. Please choose rock, paper, or scissors.',
          threadID,
          messageID
        );
      }
      
      // Update opponent's choice
      activeGame.opponent.choice = choice;
      
      if (!activeGame) return;
      
      // Update opponent's choice
      activeGame.opponent.choice = choice;
      
      // Determine winner
      const challengerChoice = activeGame.challenger.choice;
      const opponentChoice = activeGame.opponent.choice;
      
      let challengerResult;
      if (challengerChoice === opponentChoice) {
        challengerResult = 'tie';
      } else if (
        (challengerChoice === 'rock' && opponentChoice === 'scissors') ||
        (challengerChoice === 'paper' && opponentChoice === 'rock') ||
        (challengerChoice === 'scissors' && opponentChoice === 'paper')
      ) {
        challengerResult = 'win';
      } else {
        challengerResult = 'lose';
      }
      
      // Create result message
      let resultMessage = `🎮 𝐑𝐨𝐜𝐤 𝐏𝐚𝐩𝐞𝐫 𝐒𝐜𝐢𝐬𝐬𝐨𝐫𝐬 𝐑𝐞𝐬𝐮𝐥𝐭𝐬\n\n`;
      resultMessage += `@${activeGame.challenger.name}'s choice: ${getEmoji(challengerChoice)} ${challengerChoice}\n`;
      resultMessage += `@${activeGame.opponent.name}'s choice: ${getEmoji(opponentChoice)} ${opponentChoice}\n\n`;
      
      // Add result
      if (challengerResult === 'tie') {
        resultMessage += `🤝 It's a tie!`;
      } else {
        const winnerId = challengerResult === 'win' ? activeGame.challenger.id : activeGame.opponent.id;
        const winnerName = challengerResult === 'win' ? activeGame.challenger.name : activeGame.opponent.name;
        
        // Get winner's currency
        let winnerCurrency = await global.Currency.findOne({ userID: winnerId });
        if (!winnerCurrency) {
          // Create new currency record if not exists
          winnerCurrency = new global.Currency({
            userID: winnerId,
            money: 0,
            exp: 0,
            level: 1
          });
        }
        
        // Award coins for winning
        const winAmount = 100;
        winnerCurrency.money += winAmount;
        await winnerCurrency.save();
        
        resultMessage += `🎉 @${winnerName} wins and earns ${winAmount} coins!\n`;
        resultMessage += `💰 New balance: ${winnerCurrency.money} coins`;
      }
      
      // Send result message
      api.sendMessage(
        {
          body: resultMessage,
          mentions: [
            { tag: `@${activeGame.challenger.name}`, id: activeGame.challenger.id },
            { tag: `@${activeGame.opponent.name}`, id: activeGame.opponent.id }
          ]
        },
        threadID
      );
      
      // Remove the game
      global.client.rpsGames.delete(gameID);
      
    } catch (error) {
      global.logger.error('Error handling RPS event:', error.message);
    }
  }
};

/**
 * Get emoji for RPS choice
 * @param {string} choice - rock, paper, or scissors
 * @returns {string} Emoji for the choice
 */
function getEmoji(choice) {
  switch (choice) {
    case 'rock': return '👊';
    case 'paper': return '✋';
    case 'scissors': return '✌️';
    default: return '';
  }
}