/**
 * Start script for Render.com deployment
 * This script is used to start the bot on Render.com
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Log startup
console.log('Starting bot on Render.com...');

// Check if we're running on Render
if (process.env.RENDER_EXTERNAL_URL) {
  console.log(`Detected Render.com environment: ${process.env.RENDER_EXTERNAL_URL}`);
}

// Create public directory if it doesn't exist
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
  console.log('Created public directory for web server');
}

/**
 * Function to start the bot process
 * This allows for multiple restarts without accumulating processes
 */
function startBot() {
  // Start the bot
  const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Handle bot process close event
  bot.on('close', (code) => {
    console.log(`Bot process exited with code ${code}`);

    // If exit code is 0, restart the bot (used by restart command)
    if (code === 2) {
      console.log('Bot exited with code 2, restarting...');
      // Start a new bot process by calling startBot again
      startBot();
    } else {
      // For other exit codes, exit the process
      process.exit(code);
    }
  });

  // Handle bot process error
  bot.on('error', (err) => {
    console.error('Failed to start bot process:', err);
    process.exit(1);
  });

  return bot;
}

// Start the bot
const bot = startBot();

bot.on('error', (err) => {
  console.error('Failed to start bot process:', err);
  process.exit(1);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down...');
  bot.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down...');
  bot.kill('SIGTERM');
});

// Add global error handlers for better logging
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:');
  console.error(err);
  // Don't exit the process to keep the bot running
});

process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();

  // Enhanced error logging with highlighting
  console.error('\n' + '🚨'.repeat(30));
  console.error('❌ UNHANDLED PROMISE REJECTION DETECTED ON RENDER');
  console.error('📍 Promise:', promise);
  console.error('🔥 Reason:', reason);
  console.error('⏰ Time:', timestamp);
  console.error('🌐 Environment: Render.com');
  console.error('🚨'.repeat(30) + '\n');

  // Don't exit the process to keep the bot running
});
