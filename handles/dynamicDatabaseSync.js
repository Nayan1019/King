/**
 * Dynamic Database Sync
 * Populates database from incoming messages when getThreadList fails
 */

const { createUser, createThread } = require('./handleCreateDatabase');

/**
 * Dynamically sync thread and user to database from message
 * @param {Object} api - Facebook API instance
 * @param {Object} message - Message object
 */
async function syncFromMessage(api, message) {
  if (!message.threadID || !message.senderID) return;
  
  try {
    const threadID = message.threadID;
    const senderID = message.senderID;
    
    // Skip bot's own messages
    if (senderID === global.client.botID) return;
    
    // Check if thread exists in database
    const threadExists = await global.Thread.exists({ threadID });
    
    if (!threadExists) {
      global.logger.debug(`New thread detected from message: ${threadID}`);
      
      // Get thread info to populate database
      try {
        const threadInfo = await new Promise((resolve, reject) => {
          api.getThreadInfo(threadID, (err, info) => {
            if (err) {
              // If can't get thread info, create basic entry
              resolve({
                threadID,
                threadName: 'Unknown Group (Auto-detected)',
                userInfo: [],
                participantIDs: [senderID]
              });
            } else {
              resolve(info);
            }
          });
        });
        
        // Get user info for the sender
        let senderName = 'Unknown User';
        try {
          const userInfo = await new Promise((resolve, reject) => {
            api.getUserInfo(senderID, (err, info) => {
              if (err) resolve(null);
              else resolve(info[senderID]);
            });
          });
          
          if (userInfo) {
            senderName = userInfo.name;
          }
        } catch (userInfoError) {
          global.logger.debug(`Couldn't get user info for ${senderID}: ${userInfoError.message}`);
        }
        
        // Create user if doesn't exist
        const userExists = await global.User.exists({ userID: senderID });
        if (!userExists) {
          await createUser(senderID, senderName, threadID);
          global.logger.database(`Auto-created user from message: ${senderID} (${senderName})`);
        }
        
        // Prepare participants list
        const participants = [];
        
        if (threadInfo.userInfo && threadInfo.userInfo.length > 0) {
          // Full thread info available
          for (const participant of threadInfo.userInfo) {
            if (participant.id && participant.id !== global.client.botID) {
              // Create user if doesn't exist
              const participantExists = await global.User.exists({ userID: participant.id });
              if (!participantExists) {
                await createUser(participant.id, participant.name || 'Facebook User');
              }
              
              participants.push({
                id: participant.id,
                name: participant.name || 'Facebook User',
                nickname: threadInfo.nicknames?.[participant.id] || null,
                gender: participant.gender || null,
                vanity: participant.vanity && participant.vanity.trim() !== '' ? participant.vanity : null
              });
            }
          }
        } else {
          // Basic info only - add the sender
          participants.push({
            id: senderID,
            name: senderName,
            nickname: null
          });
        }
        
        // Create thread
        await createThread(threadID, threadInfo.threadName || 'Unknown Group', participants);
        global.logger.database(`Auto-created thread from message: ${threadID} (${threadInfo.threadName || 'Unknown Group'})`);
        
        return true;
      } catch (threadInfoError) {
        global.logger.debug(`Error getting thread info for auto-sync: ${threadInfoError.message}`);
        
        // Create minimal thread entry
        try {
          await createThread(threadID, 'Unknown Group (Auto-detected)', []);
          global.logger.database(`Created minimal thread entry: ${threadID}`);
          return true;
        } catch (createError) {
          global.logger.error(`Failed to create minimal thread: ${createError.message}`);
          return false;
        }
      }
    } else {
      // Thread exists, just ensure user exists
      const userExists = await global.User.exists({ userID: senderID });
      if (!userExists) {
        try {
          // Get user name
          let userName = 'Unknown User';
          try {
            const userInfo = await new Promise((resolve, reject) => {
              api.getUserInfo(senderID, (err, info) => {
                if (err) resolve(null);
                else resolve(info[senderID]);
              });
            });
            
            if (userInfo) {
              userName = userInfo.name;
            }
          } catch (userInfoError) {
            // Use fallback name
          }
          
          await createUser(senderID, userName, threadID);
          global.logger.database(`Auto-created user: ${senderID} (${userName})`);
          return true;
        } catch (createError) {
          global.logger.error(`Failed to create user from message: ${createError.message}`);
          return false;
        }
      }
    }
    
    return false; // No new records created
  } catch (error) {
    global.logger.error(`Error in dynamic database sync: ${error.message}`);
    return false;
  }
}

/**
 * Initialize dynamic database sync in message handler
 * @param {Object} api - Facebook API instance
 */
function initializeDynamicSync(api) {
  global.logger.system('🔄 Dynamic Database Sync initialized - will populate database from incoming messages');
  
  // Store the sync function globally so it can be called from message handlers
  global.dynamicDatabaseSync = (message) => syncFromMessage(api, message);
  
  return true;
}

module.exports = {
  syncFromMessage,
  initializeDynamicSync
};
