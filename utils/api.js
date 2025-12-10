/**
 * API Utility
 * Provides globally accessible API instance and helper methods
 */

let api = null;

/**
 * Set the API instance
 * @param {Object} apiInstance - The Facebook API instance
 */
function setApi(apiInstance) {
  api = apiInstance;
}

/**
 * Get the API instance
 * @returns {Object} The Facebook API instance
 */
function getApi() {
  return api;
}

/**
 * Send message to a thread
 * @param {string} threadID - Thread ID to send message to
 * @param {string|Object} message - Message content or message object
 * @param {string} [replyToMessageID] - Message ID to reply to
 * @returns {Promise<Object>} Message info
 */
async function sendMessage(threadID, message, replyToMessageID = null) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    const messageObject = typeof message === 'string' 
      ? { body: message } 
      : message;
    
    if (replyToMessageID) {
      api.sendMessage(messageObject, threadID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      }, replyToMessageID);
    } else {
      api.sendMessage(messageObject, threadID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    }
  });
}

/**
 * Get thread info
 * @param {string} threadID - Thread ID to get info for
 * @returns {Promise<Object>} Thread info
 */
async function getThreadInfo(threadID) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    api.getThreadInfo(threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}

/**
 * Get user info
 * @param {string|string[]} userID - User ID or array of User IDs to get info for
 * @returns {Promise<Object>} User info
 */
async function getUserInfo(userID) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    api.getUserInfo(userID, (err, info) => {
      if (err) return reject(err);
      // If userID is a string, return the user object directly
      // If userID is an array, return the entire info object
      if (typeof userID === 'string') {
        resolve(info[userID]);
      } else {
        resolve(info);
      }
    });
  });
}

/**
 * Set thread nickname
 * @param {string} nickname - Nickname to set
 * @param {string} threadID - Thread ID
 * @param {string} participantID - Participant ID to set nickname for
 * @returns {Promise<Object>} Result
 */
async function setNickname(nickname, threadID, participantID) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    api.changeNickname(nickname, threadID, participantID, (err) => {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

/**
 * React to a message
 * @param {string} reaction - Reaction emoji
 * @param {string} messageID - Message ID to react to
 * @returns {Promise<Object>} Result
 */
async function setMessageReaction(reaction, messageID) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    api.setMessageReaction(reaction, messageID, (err) => {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

/**
 * Remove user from group
 * @param {string} threadID - Thread ID
 * @param {string} userID - User ID to remove
 * @returns {Promise<Object>} Result
 */
async function removeUserFromGroup(threadID, userID) {
  if (!api) throw new Error('API not initialized');
  
  return new Promise((resolve, reject) => {
    api.removeUserFromGroup(userID, threadID, (err) => {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

/**
 * Get image from URL
 * @param {string} url - URL of the image
 * @returns {Promise<Stream>} Image stream
 */
async function getImageFromURL(url) {
  const axios = require('axios');
  const response = await axios.get(url, { responseType: 'stream' });
  return response.data;
}

module.exports = {
  setApi,
  getApi,
  sendMessage,
  getThreadInfo,
  getUserInfo,
  setNickname,
  setMessageReaction,
  removeUserFromGroup,
  getImageFromURL
};