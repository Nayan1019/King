/**
 * User Nickname Event
 * Handles when a user's nickname is changed in a group
 */

module.exports = {
  config: {
    name: 'userNickname',
    version: '1.0.0',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    description: 'Handles nickname change events in groups'
  },
  
  /**
   * Event handler
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object containing event data
   * @param {Object} options.logMessageData - Data specific to this event
   */
  run: async function({ api, message, logMessageData }) { 
     try { 
       const { threadID } = message; 
       const { participant_id, nickname } = logMessageData; 
       
       // Log the nickname change event with detailed information 
       global.logger.system(`Nickname Event: User ${participant_id} in thread ${threadID} nickname changed to "${nickname || 'removed'}"`); 
       
       // Get thread info to check if it's a group 
       const threadInfo = await new Promise((resolve, reject) => { 
         api.getThreadInfo(threadID, (err, info) => { 
           if (err) return reject(err); 
           resolve(info); 
         }); 
       }); 
       
       // Only process for group chats 
       if (threadInfo.isGroup) { 
         // Get user info 
         const userInfo = await new Promise((resolve, reject) => { 
           api.getUserInfo(participant_id, (err, info) => { 
             if (err) return reject(err); 
             resolve(info[participant_id]); 
           }); 
         }); 
         
         // Prepare message to send to the group 
         let message = ''; 
         const userName = userInfo.name || 'Facebook User'; 
         
         // Check if nickname was set or removed 
         if (nickname) { 
           message = `👤 ${userName}'s nickname has been set to "${nickname}"`; 
         } else { 
           message = `👤 ${userName}'s nickname has been removed`; 
         }
         
         // Check if antichange is enabled for this thread
          const antiThread = await global.AntiThread.findOne({ threadID });
          
          // Only send notification if announceNicknameChange is enabled and antichange for nicknames is not enabled
          if (global.config.announceNicknameChange && (!antiThread || !antiThread.nicknameLock)) {
           // Send notification to the group only if antichange is not enabled
           api.sendMessage(message, threadID);
         } else {
           global.logger.system(`Suppressed nickname update message because antichange is enabled for thread ${threadID}`);
         } 
         
         // Make sure the database is updated using thread controller
         try {
           // Update user nickname in thread using thread controller
           await global.controllers.thread.updateUserNickname(
             threadID,
             participant_id,
             nickname || null
           );
           
           global.logger.database(`Successfully updated nickname in thread ${threadID} for user ${participant_id}: ${nickname || 'removed'} using thread controller`);
          
         } catch (dbError) { 
           global.logger.error(`Error updating database in nickname event: ${dbError.message}`); 
         } 
       } 
     } catch (error) { 
       global.logger.error('Error in userNickname event:', error.message); 
     } 
   } 
};