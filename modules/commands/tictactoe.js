/**
 * Tic Tac Toe Game Command
 * Allows users to play tic-tac-toe in the group
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  config: {
    name: 'tictactoe',
    aliases: ['ttt', 'xo'],
    description: 'Play tic-tac-toe with another user',
    usage: '{prefix}tictactoe [@mention]',
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
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Check for admin stop command
      if (args[0] && args[0].toLowerCase() === 'stop') {
        // Check if user is admin or owner
        const isOwner = senderID === global.config.ownerID;
        const isAdmin = global.config.adminIDs.includes(senderID);
        
        if (!isOwner && !isAdmin) {
          return api.sendMessage('❌ Only admins can stop games.', threadID, messageID);
        }
        
        // Initialize game data if not exists
        if (!global.client.tttGames) {
          global.client.tttGames = new Map();
        }
        
        // Find and stop the game in this thread
        let gameFound = false;
        for (const [gameID, game] of global.client.tttGames.entries()) {
          if (game.threadID === threadID) {
            // Stop the game
            global.client.tttGames.delete(gameID);
            gameFound = true;
            
            await api.sendMessage(
              {
                body: `🛑 𝐆𝐚𝐦𝐞 𝐒𝐭𝐨𝐩𝐩𝐞𝐝\n\n` +
                      `The tic-tac-toe game between ${game.players[0].name} and ${game.players[1].name} has been stopped by an admin.`,
                mentions: [
                  { tag: `${game.players[0].name}`, id: game.players[0].id },
                  { tag: `${game.players[1].name}`, id: game.players[1].id }
                ]
              },
              threadID
            );
            break;
          }
        }
        
        if (!gameFound) {
          return api.sendMessage('❌ No active tic-tac-toe game found in this thread.', threadID, messageID);
        }
        
        return;
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Check if mentions are provided
      const mentionKeys = Object.keys(mentions);
      
      if (mentionKeys.length === 0) {
        return api.sendMessage(
          `🎮 𝐓𝐢𝐜 𝐓𝐚𝐜 𝐓𝐨𝐞\n\n` +
          `How to play:\n` +
          `1. Challenge someone: ${global.config.prefix}tictactoe [@mention]\n` +
          `2. Make a move by replying with a position number (1-9)\n` +
          `3. Stop game (admin only): ${global.config.prefix}tictactoe stop\n\n` +
          `Board positions:\n` +
          `1 | 2 | 3\n` +
          `4 | 5 | 6\n` +
          `7 | 8 | 9\n\n` +
          `Example: ${global.config.prefix}tictactoe @friend`,
          threadID,
          messageID
        );
      }
      
      // Get opponent data
      const opponentID = mentionKeys[0];
      
      // Check if player is challenging themselves
      if (opponentID === senderID) {
        return api.sendMessage('❌ You cannot challenge yourself.', threadID, messageID);
      }
      
      const opponent = await global.User.findOne({ userID: opponentID });
      
      if (!opponent) {
        return api.sendMessage('❌ Opponent data not found.', threadID, messageID);
      }
      
      // Initialize game data
      if (!global.client.tttGames) {
        global.client.tttGames = new Map();
      }
      
      // Check if there's already an active game in this thread
      for (const [id, game] of global.client.tttGames.entries()) {
        if (game.threadID === threadID) {
          const activeGame = game;
          const player1Name = activeGame.players[0].name;
          const player2Name = activeGame.players[1].name;
          
          return api.sendMessage(
            `❌ There's already an active game between ${player1Name} and ${player2Name} in this thread.\n` +
            `Please wait for the current game to finish.`,
            threadID,
            messageID
          );
        }
      }
      
      // Create new game
      const gameID = `${threadID}_${Date.now()}`;
      const newGame = {
        threadID,
        players: [
          { id: senderID, name: user.name, symbol: 'X' },
          { id: opponentID, name: opponent.name, symbol: 'O' }
        ],
        currentTurn: 0, // Index of the current player (0 or 1)
        board: Array(9).fill(null), // 3x3 board represented as a flat array
        timestamp: Date.now(),
        processedMessages: new Set()
      };
      
      global.client.tttGames.set(gameID, newGame);
      
      // Generate visual board
      const boardImagePath = await generateVisualBoard(newGame.board, gameID);
      
      await api.sendMessage(
        {
          body: `🎮 𝐓𝐢𝐜 𝐓𝐚𝐜 𝐓𝐨𝐞\n\n` +
                `Game started between ${user.name} (X) and ${opponent.name} (O)\n\n` +
                `${user.name}'s turn (X)\n` +
                `Type a position number (1-9) to make a move.`,
          mentions: [
            { tag: `${user.name}`, id: senderID },
            { tag: `${opponent.name}`, id: opponentID }
          ],
          attachment: fs.createReadStream(boardImagePath)
        },
        threadID
      );
      
      // Clean up initial board image after sending
      setTimeout(() => {
        try {
          if (fs.existsSync(boardImagePath)) {
            fs.unlinkSync(boardImagePath);
          }
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }
      }, 5000);
      
    } catch (error) {
      global.logger.error('Error in tictactoe command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  },
  
  /**
   * Handle messages for the tic-tac-toe game
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   */
  handleEvent: async function({ api, message }) {
    const { body, threadID, messageID, senderID } = message;
    
    try {
      // Check if there are any active games in this thread
      if (!global.client.tttGames || global.client.tttGames.size === 0) return;
      
      // Ignore command messages
      if (body.startsWith(global.config.prefix)) return;
      
      // Find the game in this thread
      let activeGame = null;
      let gameID = null;
      
      for (const [id, game] of global.client.tttGames.entries()) {
        if (game.threadID === threadID) {
          activeGame = game;
          gameID = id;
          break;
        }
      }
      
      if (!activeGame) return;
      
      // Parse the move
      const position = parseInt(body.trim());
      
      // Validate the move
      if (isNaN(position) || position < 1 || position > 9) {
        return; // Silently ignore invalid moves
      }
      
      // Prevent multiple processing of same message
      const messageKey = `${senderID}_${position}_${Date.now()}`;
      if (!activeGame.processedMessages) {
        activeGame.processedMessages = new Set();
      }
      
      // Check if we've already processed this exact move from this user recently
      const recentProcessed = Array.from(activeGame.processedMessages).some(key => 
        key.startsWith(`${senderID}_${position}_`) && 
        (Date.now() - parseInt(key.split('_')[2])) < 2000 // Within 2 seconds
      );
      
      if (recentProcessed) return;
      
      // Add to processed messages
      activeGame.processedMessages.add(messageKey);
      
      // Clean up old processed messages (older than 5 seconds)
      const now = Date.now();
      for (const key of activeGame.processedMessages) {
        const timestamp = parseInt(key.split('_')[2]);
        if (now - timestamp > 5000) {
          activeGame.processedMessages.delete(key);
        }
      }
      
      // Check if it's the player's turn
      const currentPlayer = activeGame.players[activeGame.currentTurn];
      if (currentPlayer.id !== senderID) {
        return api.sendMessage(
          `❌ It's not your turn. It's ${currentPlayer.name}'s turn (${currentPlayer.symbol}).`,
          threadID,
          messageID
        );
      }
      
      // Convert to 0-based index
      const index = position - 1;
      
      // Check if the position is already taken
      if (activeGame.board[index] !== null) {
        return api.sendMessage(
          `❌ That position is already taken. Please choose another position.`,
          threadID,
          messageID
        );
      }
      
      // Make the move
      activeGame.board[index] = currentPlayer.symbol;
      
      // Check for win or draw
      const winner = checkWinner(activeGame.board);
      const isDraw = !winner && activeGame.board.every(cell => cell !== null);
      
      // Update the game state
      if (winner || isDraw) {
        // Game over - generate final board image
        const finalBoardImagePath = await generateVisualBoard(activeGame.board, gameID + '_final');
        let resultMessage = `🎮 𝐆𝐚𝐦𝐞 𝐎𝐯𝐞𝐫\n\n`;
        
        if (winner) {
          // Find the winner
          const winnerPlayer = activeGame.players.find(player => player.symbol === winner);
          
          // Award coins to the winner
          const winAmount = 300;
          let winnerCurrency = await global.Currency.findOne({ userID: winnerPlayer.id });
          
          if (!winnerCurrency) {
            // Create new currency record if not exists
            winnerCurrency = new global.Currency({
              userID: winnerPlayer.id,
              money: 0,
              exp: 0,
              level: 1
            });
          }
          
          winnerCurrency.money += winAmount;
          await winnerCurrency.save();
          
          resultMessage += `🎉 ${winnerPlayer.name} (${winnerPlayer.symbol}) wins and earns ${winAmount} coins!\n`;
          resultMessage += `💰 New balance: ${winnerCurrency.money} coins`;
        } else {
          resultMessage += `🤝 It's a draw! No winner.`;
        }
        
        // Send result message with final board image
        api.sendMessage(
          {
            body: resultMessage,
            mentions: [
              { tag: `${activeGame.players[0].name}`, id: activeGame.players[0].id },
              { tag: `${activeGame.players[1].name}`, id: activeGame.players[1].id }
            ],
            attachment: fs.createReadStream(finalBoardImagePath)
          },
          threadID
        );
        
        // Clean up temporary files
        setTimeout(() => {
          try {
            if (fs.existsSync(finalBoardImagePath)) {
              fs.unlinkSync(finalBoardImagePath);
            }
          } catch (err) {
            console.error('Error cleaning up temp file:', err);
          }
        }, 5000);
        
        // Remove the game
        global.client.tttGames.delete(gameID);
      } else {
        // Game continues
        // Switch to the next player
        activeGame.currentTurn = (activeGame.currentTurn + 1) % 2;
        const nextPlayer = activeGame.players[activeGame.currentTurn];
        
        // Generate updated visual board
        const updatedBoardImagePath = await generateVisualBoard(activeGame.board, gameID + '_move');
        
        // Send updated board
        api.sendMessage(
          {
            body: `🎮 𝐓𝐢𝐜 𝐓𝐚𝐜 𝐓𝐨𝐞\n\n` +
                  `${nextPlayer.name}'s turn (${nextPlayer.symbol})\n` +
                  `Type a position number (1-9) to make a move.`,
            mentions: [{ tag: `${nextPlayer.name}`, id: nextPlayer.id }],
            attachment: fs.createReadStream(updatedBoardImagePath)
          },
          threadID
        );
        
        // Clean up temporary files after sending
        setTimeout(() => {
          try {
            if (fs.existsSync(updatedBoardImagePath)) {
              fs.unlinkSync(updatedBoardImagePath);
            }
          } catch (err) {
            console.error('Error cleaning up temp file:', err);
          }
        }, 5000);
        
        // Update the game state
        global.client.tttGames.set(gameID, activeGame);
      }
      
    } catch (error) {
      global.logger.error('Error handling tictactoe event:', error.message);
    }
  }
};

/**
 * Render the tic-tac-toe board
 * @param {Array} board - The game board
 * @returns {string} The rendered board
 */
function renderBoard(board) {
  let result = '';
  
  for (let i = 0; i < 9; i += 3) {
    result += `${renderCell(board[i])} | ${renderCell(board[i+1])} | ${renderCell(board[i+2])}\n`;
    if (i < 6) result += `―――――――――\n`;
  }
  
  return result;
}

/**
 * Render a cell on the board
 * @param {string|null} value - The cell value (X, O, or null)
 * @returns {string} The rendered cell
 */
function renderCell(value) {
  if (value === 'X') return '❌';
  if (value === 'O') return '⭕';
  return '  ';
}

/**
 * Generate visual tic-tac-toe board image
 * @param {Array} board - The game board
 * @param {string} gameID - Unique game identifier
 * @returns {string} Path to the generated image
 */
async function generateVisualBoard(board, gameID) {
  try {
    // Create canvas with proper size
    const canvas = createCanvas(1200, 1200);
    const ctx = canvas.getContext('2d');
    
    // Load images
    const backgroundPath = path.join(__dirname, 'cache', 'tictactoe', 'background.png');
    const xImagePath = path.join(__dirname, 'cache', 'tictactoe', 'X.png');
    const oImagePath = path.join(__dirname, 'cache', 'tictactoe', 'O.png');
    
    const bgImage = await loadImage(backgroundPath);
    const xImage = await loadImage(xImagePath);
    const oImage = await loadImage(oImagePath);
    
    // Draw background
    ctx.drawImage(bgImage, 0, 0, 1200, 1200);
    
    // Define exact positions for each cell (matching your working code)
    const positions = [
      [40, 40], [400, 40], [760, 40],     // Row 1: positions 1, 2, 3
      [40, 400], [400, 400], [760, 400],   // Row 2: positions 4, 5, 6
      [40, 760], [400, 760], [760, 760]    // Row 3: positions 7, 8, 9
    ];
    
    // Draw X and O images at correct positions
    board.forEach((cell, idx) => {
      if (cell === 'X') {
        ctx.drawImage(xImage, positions[idx][0], positions[idx][1], 400, 400);
      } else if (cell === 'O') {
        ctx.drawImage(oImage, positions[idx][0], positions[idx][1], 400, 400);
      }
    });
    
    // Save the image
    const outputPath = path.join(__dirname, 'cache', 'tictactoe', `board_${gameID}_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating visual board:', error);
    // Fallback: create a simple text-based image
    return await generateFallbackBoard(board, gameID);
  }
}

/**
 * Generate fallback text-based board image
 * @param {Array} board - The game board
 * @param {string} gameID - Unique game identifier
 * @returns {string} Path to the generated image
 */
async function generateFallbackBoard(board, gameID) {
  try {
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 600, 600);
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(200, 50);
    ctx.lineTo(200, 550);
    ctx.moveTo(400, 50);
    ctx.lineTo(400, 550);
    ctx.stroke();
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(50, 200);
    ctx.lineTo(550, 200);
    ctx.moveTo(50, 400);
    ctx.lineTo(550, 400);
    ctx.stroke();
    
    // Draw X and O
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const positions = [
      [135, 135], [300, 135], [475, 135],
      [125, 300], [300, 300], [475, 300],
      [125, 475], [300, 475], [475, 475]
    ];
    
    for (let i = 0; i < 9; i++) {
      if (board[i] === 'X') {
        ctx.fillStyle = '#ff4444';
        ctx.fillText('X', positions[i][0], positions[i][1]);
      } else if (board[i] === 'O') {
        ctx.fillStyle = '#4444ff';
        ctx.fillText('O', positions[i][0], positions[i][1]);
      }
    }
    
    // Draw position numbers for empty cells
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#888';
    
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        ctx.fillText((i + 1).toString(), positions[i][0], positions[i][1]);
      }
    }
    
    // Save the image
    const outputPath = path.join(__dirname, 'cache', 'tictactoe', `fallback_board_${gameID}_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating fallback board:', error);
    throw error;
  }
}

/**
 * Check if there's a winner
 * @param {Array} board - The game board
 * @returns {string|null} The winner (X or O) or null if no winner
 */
function checkWinner(board) {
  // Define winning combinations
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  
  // Check each winning pattern
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return the winner (X or O)
    }
  }
  
  return null; // No winner
}