/**
 * Thread Rename Event
 * Handles when a group chat's name is changed
 */

module.exports = {
  config: {
    name: 'threadRename',
    description: 'Handles thread name change events',
    version: '1.0.0',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭"
  },
  
  /**
   * Event execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.logMessageData - Event data
   */
  run: async function({ api, message, logMessageData }) {
    const { threadID } = message;
    
    try {
      // Debug log to see what's in the message and logMessageData
      global.logger.debug(`Thread rename event data - message: ${JSON.stringify(message)}`); 
      global.logger.debug(`Thread rename event data - logMessageData: ${JSON.stringify(logMessageData)}`);
      
      // Get thread info from Facebook API to get the actual thread name
      let newThreadName;
      try {
        const threadInfo = await new Promise((resolve, reject) => {
          api.getThreadInfo(threadID, (err, info) => {
            if (err) return reject(err);
            resolve(info);
          });
        });
        
        global.logger.debug(`Thread info from API: ${JSON.stringify(threadInfo)}`);
        
        // Check all possible sources for the thread name
        // In log:thread-name events, the new name can be in different properties depending on the fca-priyansh version
        newThreadName = threadInfo.threadName || 
                       message.body || 
                       logMessageData.name || 
                       logMessageData.threadName || 
                       message.logMessageBody || 
                       'Unnamed Group';
                       
        global.logger.debug(`Using thread name: ${newThreadName}`);
      } catch (apiError) {
        global.logger.error(`Error getting thread info from API: ${apiError.message}`);
        // Fallback logic if API call fails
        newThreadName = message.body || 
                       logMessageData.name || 
                       logMessageData.threadName || 
                       message.logMessageBody || 
                       'Unnamed Group';
        global.logger.debug(`Using fallback thread name: ${newThreadName}`);
      }
      
      // Log the thread name change event
      global.logger.system(`Thread name changed in ${threadID} to "${newThreadName}"`);
      
      // Update thread name in database
      try {
        // Use thread controller to update thread name
        const updated = await global.controllers.thread.createOrUpdateThread(threadID, {
          threadName: newThreadName
        });
        
        if (updated) {
          global.logger.database(`Updated thread name in database using controller: ${threadID} (${newThreadName})`);
        } else {
          // No change needed
          global.logger.debug(`Thread name unchanged in database: ${threadID} (${newThreadName})`);
          return;
        }
        
        global.logger.database(`Saved thread name update to database: ${threadID} (${newThreadName})`);
        
        // Check if antichange is enabled for this thread
        const antiThread = await global.AntiThread.findOne({ threadID });
        
        // Only send notification if announceNameChange is enabled and antichange for group name is not enabled
        if (global.config.announceNameChange && (!antiThread || !antiThread.groupNameLock)) {
          // Get the user who changed the thread name
          let actorName = 'Someone';
          if (logMessageData.actor) {
            try {
              const userInfo = await new Promise((resolve, reject) => {
                api.getUserInfo(logMessageData.actor, (err, info) => {
                  if (err) return reject(err);
                  resolve(info);
                });
              });
              
              if (userInfo && userInfo[logMessageData.actor]) {
                actorName = userInfo[logMessageData.actor].name || 'Someone';
              }
            } catch (userError) {
              global.logger.error(`Error getting user info: ${userError.message}`);
            }
          }
          
          // Send notification to the group only if antichange is not enabled
          const message = `📝 Group name has been updated to "${newThreadName}" by ${actorName} in the database`;
          await api.sendMessage(message, threadID);
        } else {
          global.logger.system(`Suppressed group name update message because antichange is enabled for thread ${threadID}`);
        }
      } catch (dbError) {
        global.logger.error(`Error updating thread name in database:`, dbError.message);
      }
    } catch (error) {
      global.logger.error('Error in threadRename event:', error.message);
    }
  }
};