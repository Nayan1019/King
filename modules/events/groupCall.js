/**
 * Group Call Event
 * Handles group call notifications
 */

// Thread model is accessed via global.Thread

module.exports = {
  config: {
    name: 'groupCall',
    description: 'Handles group call notifications',
    version: '1.0.0',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭'
  },
  
  /**
   * Event execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.logMessageData - Event data
   */
  run: async function({ api, message, logMessageData }) {
    const { threadID, logMessageType } = message;
    
    try {
      // Debug log to see what's in the message and logMessageData
      global.logger.debug(`Group call event data - message type: ${logMessageType}`);
      global.logger.debug(`Group call event data - logMessageData: ${JSON.stringify(logMessageData)}`);
      
      // Skip if no call data
      if (!logMessageData) return;
      
      // Check for joining_user in logMessageData (for participant joined events)
      const joiningUser = logMessageData.joining_user || null;
      if (joiningUser && joiningUser !== global.client.botID) {
        // This is likely a user joining the call
        global.logger.debug(`Detected user joining call: ${joiningUser}`);
        
        // Skip sending notification here to avoid duplication
        // Notification will be handled by handleThreadCall function
        
        // Continue with normal processing
      }
      
      // Handle different event types
      if (logMessageType === 'log:thread-call') {
        // Handle thread-call event (new format)
        return await this.handleThreadCall({ api, message, logMessageData, threadID });
      }
      
      // Get caller ID for log:call event (old format)
      const callerID = logMessageData.caller_id || logMessageData.joining_user || 'unknown';
      
      // Skip if caller is the bot
      if (callerID === global.client.botID) return;
      
      // Get call type (video or audio)
      const isVideo = logMessageData.video;
      const callType = isVideo ? 'video' : 'audio';
      
      // Get caller info
      let callerName = 'Someone';
      
      try {
        // Try to get name from Facebook
        const userInfo = await new Promise((resolve, reject) => {
          api.getUserInfo(callerID, (err, info) => {
            if (err) return reject(err);
            resolve(info[callerID]);
          });
        });
        
        if (userInfo && userInfo.name) {
          callerName = userInfo.name;
        }
      } catch (error) {
        global.logger.error('Error getting caller info:', error.message);
      }
      
      // Check if call started or ended
      if (logMessageData.event === 'group_call_started') {
        // Call started
        const message = `📞 ${callerName} started a ${callType} call in this group.`;
        await global.api.sendMessage(message, threadID);
      } else if (logMessageData.event === 'group_call_participant_joined') {
        // Participant joined
        const joinMessage = `📞 ${callerName} joined the ${callType} call.`;
        await global.api.sendMessage(joinMessage, threadID);
      } else if (logMessageData.event === 'group_call_ended') {
        // Call ended
        // Get call duration
        let duration = 'unknown duration';
        
        if (logMessageData.call_duration) {
          const seconds = parseInt(logMessageData.call_duration);
          if (seconds < 60) {
            duration = `${seconds} seconds`;
          } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            duration = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            if (remainingSeconds > 0) {
              duration += ` ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
            }
          }
        }
        
        // Get participants who were in the call
        let participantNames = [];
        if (logMessageData.missed_call_participant_ids) {
          try {
            // Parse the participant IDs from the string
            const participantIds = JSON.parse(logMessageData.missed_call_participant_ids);
            
            if (participantIds && participantIds.length > 0) {
              // Get names of all participants
              const userInfos = await new Promise((resolve, reject) => {
                api.getUserInfo(participantIds, (err, info) => {
                  if (err) return reject(err);
                  resolve(info);
                });
              });
              
              // Extract names
              participantNames = participantIds.map(id => {
                if (userInfos[id] && userInfos[id].name) {
                  return userInfos[id].name;
                }
                return 'Unknown User';
              });
            }
          } catch (error) {
            global.logger.debug(`Could not get participant info: ${error.message}`);
          }
        }
        
        // Don't show participants list as per user request
        const message = `📞 The ${callType} call started by ${callerName} has ended.\nDuration: ${duration}`;
        await global.api.sendMessage(message, threadID);
      }
      
    } catch (error) {
      global.logger.error('Error in groupCall event:', error.message);
    }
  },
  /**
   * Handle thread-call events (new format)
   * @param {Object} options - Options object
   */
  handleThreadCall: async function({ api, message, logMessageData, threadID }) {
    try {
      // Extract data from the new format
      const joiningUser = logMessageData.caller_id || logMessageData.joining_user || 'unknown';
      const callType = logMessageData.video ? 'video' : 'audio';
      
      // Check if this is a join event (when joining_user is present but no specific event)
      const isJoinEvent = !logMessageData.event && logMessageData.joining_user;
      
      // Skip if caller is the bot
      if (joiningUser === global.client.botID) return;
      
      // Get caller info
      let callerName = 'Someone';
      
      try {
        // Try to get name from Facebook
        // Only attempt to get user info if we have a valid user ID
        if (joiningUser && joiningUser !== 'unknown' && joiningUser !== '0') {
          try {
            const userInfo = await new Promise((resolve, reject) => {
              api.getUserInfo(joiningUser, (err, info) => {
                if (err) return reject(err);
                resolve(info);
              });
            });
            
            if (userInfo && userInfo[joiningUser] && userInfo[joiningUser].name) {
              callerName = userInfo[joiningUser].name;
            }
          } catch (error) {
            global.logger.debug(`Could not get user info for ID ${joiningUser}: ${error.message}`);
            // Continue with default name
          }
        }
      } catch (error) {
        global.logger.error('Error in caller info section for thread-call:', error.message);
      }
      
      // Check if call started, ended, or participant joined
      if (logMessageData.event === 'group_call_participant_joined') {
        // Participant joined
        const joinMessage = `📞 ${callerName} joined the ${callType} call.`;
        await global.api.sendMessage(joinMessage, threadID);
      } else if (logMessageData.event === 'group_call_ended') {
        // Call ended
        // Get call duration
        let duration = 'unknown duration';
        
        if (logMessageData.call_duration) {
          const seconds = parseInt(logMessageData.call_duration);
          if (seconds < 60) {
            duration = `${seconds} seconds`;
          } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            duration = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            if (remainingSeconds > 0) {
              duration += ` ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
            }
          }
        }
        
        // Get participants who were in the call
        let participantNames = [];
        if (logMessageData.missed_call_participant_ids) {
          try {
            // Parse the participant IDs from the string
            const participantIds = JSON.parse(logMessageData.missed_call_participant_ids);
            
            if (participantIds && participantIds.length > 0) {
              // Get names of all participants
              const userInfos = await new Promise((resolve, reject) => {
                api.getUserInfo(participantIds, (err, info) => {
                  if (err) return reject(err);
                  resolve(info);
                });
              });
              
              // Extract names
              participantNames = participantIds.map(id => {
                if (userInfos[id] && userInfos[id].name) {
                  return userInfos[id].name;
                }
                return 'Unknown User';
              });
            }
          } catch (error) {
            global.logger.debug(`Could not get participant info: ${error.message}`);
          }
        }
        
        // Don't show participants list as per user request
        const message = `📞 The ${callType} call started by ${callerName} has ended.\nDuration: ${duration}`;
        await api.sendMessage(message, threadID);
      } else if (logMessageData.event === 'group_call_started') {
        // Call started
        const callMessage = `📞 ${callerName} started a ${callType} call in this group.`;
        await api.sendMessage(callMessage, threadID);
      } else if (isJoinEvent) {
        // Participant joined (through alternative detection)
        const joinMessage = `📞 ${callerName} joined the ${callType} call.`;
        await api.sendMessage(joinMessage, threadID);
      } else {
        // Default case - likely a call start if no specific event
        const callMessage = `📞 ${callerName} started a ${callType} call in this group.`;
        await api.sendMessage(callMessage, threadID);
      }
      
    } catch (error) {
      global.logger.error('Error handling thread-call event:', error.message);
    }
  }
};