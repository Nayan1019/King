/**
 * Start script for local development
 * This script starts the bot and logs the preview URL
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Log startup
console.log(chalk.blue('Starting Facebook Messenger Bot...'));

// Create public directory if it doesn't exist
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
  console.log(chalk.green('Created public directory for web server'));
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
    console.log(chalk.red(`Bot process exited with code ${code}`));

    // If exit code is 2, restart the bot (used by restart command)
    if (code === 2) {
      console.log(chalk.yellow('Bot exited with code 2, restarting...'));
      // Start a new bot process by calling startBot again
      startBot();
    } else {
      // For other exit codes, exit the process
      process.exit(code);
    }
  });

  // Handle bot process error
  bot.on('error', (err) => {
    console.error(chalk.red('Failed to start bot process:'), err);
    process.exit(1);
  });

  return bot;
}

// Start the bot
const bot = startBot();

// Log preview URL after a short delay
setTimeout(() => {
  console.log(chalk.yellow('\n======================================'));
  console.log(chalk.green('🌐 Preview available at:'), chalk.cyan('http://localhost:4000'));
  console.log(chalk.yellow('======================================\n'));
}, 3000);

// Handle termination signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nReceived SIGINT signal, shutting down...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\nReceived SIGTERM signal, shutting down...'));
  process.exit(0);
});

// Add global error handlers for better logging
process.on('uncaughtException', (err) => {
  console.error(chalk.red('❌ Uncaught Exception:'));
  console.error(err);
  // Don't exit the process to keep the bot running
});

process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();

  // Enhanced error logging with highlighting
  console.error('\n' + chalk.red('🚨'.repeat(25)));
  console.error(chalk.red.bold('❌ UNHANDLED PROMISE REJECTION DETECTED'));
  console.error(chalk.red('📍 Promise:'), promise);
  console.error(chalk.red('🔥 Reason:'), reason);
  console.error(chalk.red('⏰ Time:'), timestamp);
  console.error(chalk.red('🚨'.repeat(25)) + '\n');

  // Don't exit the process to keep the bot running
});
