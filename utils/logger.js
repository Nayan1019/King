/**
 * Logger Utility
 * Logs actions, errors, and status with timestamps
 */

const chalk = require('chalk');
const moment = require('moment-timezone');

// Set timezone
moment.tz.setDefault('Asia/Kolkata'); // Change to your timezone

/**
 * Get formatted timestamp
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Create a box around text
 * @param {string} text - Text to put in box
 * @param {Function} colorFn - Chalk color function
 * @returns {string} Boxed text
 */
function boxText(text, colorFn = chalk.white) {
  const boxWidth = text.length + 4;
  const horizontalLine = '─'.repeat(boxWidth - 2);
  
  return [
    colorFn(`┌${horizontalLine}┐`),
    colorFn(`│  ${text}  │`),
    colorFn(`└${horizontalLine}┘`)
  ].join('\n');
}

/**
 * Format text with padding
 * @param {string} text - Text to format
 * @param {number} length - Desired length
 * @returns {string} Padded text
 */
function padText(text, length = 10) {
  if (text.length >= length) return text;
  return text + ' '.repeat(length - text.length);
}

/**
 * Log system message
 * @param {...any} args - Message arguments
 */
function system(...args) {
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  const label = chalk.yellow.bold(`[${padText('SYSTEM', 8)}]`);
  console.log(timestamp, label, ...args);
}

/**
 * Log command usage
 * @param {...any} args - Message arguments
 */
function command(...args) {
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  const label = chalk.green.bold(`[${padText('COMMAND', 8)}]`);
  console.log(timestamp, label, ...args);
}

/**
 * Log event trigger
 * @param {...any} args - Message arguments
 */
function event(...args) {
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  const label = chalk.magenta.bold(`[${padText('EVENT', 8)}]`);
  console.log(timestamp, label, ...args);
}

/**
 * Log database operations
 * @param {...any} args - Message arguments
 */
function database(...args) {
  // CRITICAL FIX: Ensure database logs are always visible regardless of debug mode
  // Add extra visibility for nickname changes
  const message = args.join(' ');
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  
  if (message.includes('nickname change for user')) {
    // Make nickname changes more visible
    console.log(timestamp, chalk.cyan.bold(`[${padText('DATABASE', 8)}]`), chalk.yellow('⭐'), ...args, chalk.yellow('⭐'));
    
    // Also log to system for critical visibility
    system(`DATABASE NICKNAME UPDATE: ${message}`);
    
    // Create a highlighted box for important updates
    console.log('\n' + boxText(`NICKNAME UPDATE: ${message}`, chalk.cyan.bold) + '\n');
  } else {
    // Regular database logs
    console.log(timestamp, chalk.cyan.bold(`[${padText('DATABASE', 8)}]`), ...args);
  }
}

/**
 * Log error message with enhanced highlighting
 * @param {...any} args - Message arguments
 */
function error(...args) {
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  const label = chalk.red.bold(`[${padText('ERROR', 8)}]`);
  
  // Create a highlighted box for errors
  const errorMessage = args.join(' ');
  console.error(timestamp, label, ...args);
  
  // Special highlighting for unhandledRejection errors
  if (errorMessage.includes('UNHANDLED PROMISE REJECTION') || 
      errorMessage.includes('unhandledRejection') ||
      errorMessage.includes('Unhandled Promise Rejection')) {
    console.error('\n' + '🚨'.repeat(30));
    console.error(chalk.red.bold('⚠️  CRITICAL: UNHANDLED PROMISE REJECTION DETECTED  ⚠️'));
    console.error('🚨'.repeat(30));
    console.error(chalk.yellow('This indicates a promise that was rejected but not properly handled.'));
    console.error(chalk.yellow('Please check the error details above and fix the promise handling.'));
    console.error('🚨'.repeat(30) + '\n');
  }
  // For other critical errors, add a box
  else if (errorMessage.includes('critical') || errorMessage.includes('fatal') || 
           errorMessage.includes('crashed') || errorMessage.includes('failed')) {
    console.error('\n' + boxText(`CRITICAL ERROR: ${errorMessage}`, chalk.red.bold) + '\n');
  }
}

/**
 * Log warning message
 * @param {...any} args - Message arguments
 */
function warn(...args) {
  const timestamp = chalk.blue(`[${getTimestamp()}]`);
  const label = chalk.yellow.bold(`[${padText('WARNING', 8)}]`);
  console.warn(timestamp, label, ...args);
}

/**
 * Log debug message (only if debug mode is enabled)
 * @param {...any} args - Message arguments
 */
function debug(...args) {
  if (global.config && global.config.debug) {
    const timestamp = chalk.blue(`[${getTimestamp()}]`);
    const label = chalk.gray.bold(`[${padText('DEBUG', 8)}]`);
    console.debug(timestamp, label, ...args);
  }
}

module.exports = {
  system,
  command,
  event,
  database,
  error,
  warn,
  debug
};