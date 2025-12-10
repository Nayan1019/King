const { generateWelcomeImage } = require("../../utils/welcomeImage");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: 'userJoin',
    description: 'Welcomes new users to a group',
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
  run: async function ({ api, message, logMessageData }) {
    const { threadID } = message;

    try {
      // Get thread settings
      const thread = await global.Thread.findOne({ threadID });

      // Skip if welcome is disabled for this thread
      if (thread && thread.settings && thread.settings.welcome === false) {
        return global.logger.debug(`Welcome message disabled for thread ${threadID}`);
      }

      // Get added participants
      const addedParticipants = logMessageData.addedParticipants || [];

      // Skip if no participants added (shouldn't happen)
      if (addedParticipants.length === 0) {
        return;
      }

      // Check if the bot was added to a new group
      const botAdded = addedParticipants.some(user => user.userFbId === global.client.botID);

      if (botAdded) {
        // Bot was added to a new group
        global.logger.system(`Bot was added to thread ${threadID}`);

        // Set bot nickname from config.json
        if (global.config.botNickname) {
          try {
            await new Promise((resolve, reject) => {
              api.changeNickname(global.config.botNickname, threadID, global.client.botID, (err) => {
                if (err) {
                  global.logger.error(`Error setting bot nickname in thread ${threadID}:`, err);
                  reject(err);
                } else {
                  global.logger.system(`✅ Bot nickname set to "${global.config.botNickname}" in thread ${threadID}`);
                  resolve();
                }
              });
            }).catch(() => { }); // Don't block if nickname setting fails
          } catch (nicknameError) {
            global.logger.error(`Error setting bot nickname:`, nicknameError);
          }
        }

        // Create thread in database when bot is added
        try {
          // Get thread info from Facebook API
          const threadInfo = await new Promise((resolve, reject) => {
            api.getThreadInfo(threadID, (err, info) => {
              if (err) return reject(err);
              resolve(info);
            });
          });

          // Format participants
          const participants = [];

          // Validate userInfo is iterable
          const userInfoArray = Array.isArray(threadInfo.userInfo)
            ? threadInfo.userInfo
            : (threadInfo.participantIDs && Array.isArray(threadInfo.participantIDs))
              ? threadInfo.participantIDs.map(id => ({ id, name: 'Facebook User' }))
              : [];

          for (const participant of userInfoArray) {
            // Skip if no ID (shouldn't happen)
            if (!participant || !participant.id) continue;

            // Skip bot user
            if (participant.id === global.client.botID) continue;

            // Get nickname from thread nicknames if available
            let nickname = null;
            if (threadInfo.nicknames && threadInfo.nicknames[participant.id]) {
              nickname = threadInfo.nicknames[participant.id];
            }

            // Add to participants list
            participants.push({
              id: participant.id,
              name: participant.name || 'Facebook User',
              nickname: nickname,
              gender: participant.gender || null,
              vanity: participant.vanity && participant.vanity.trim() !== '' ? participant.vanity : null
            });

            // Create or update user in database
            await global.handleCreateDatabase?.createUser(participant.id, participant.name || 'Facebook User');
          }

          // Create new thread or update if it exists using thread controller
          await global.controllers.thread.createOrUpdateThread(
            threadInfo.threadID,
            {
              threadName: threadInfo.threadName || 'Unnamed Group',
              users: participants
            }
          );

          global.logger.database(`Thread ${threadID} created/updated in database because bot was added`);
        } catch (dbError) {
          global.logger.error(`Error creating thread ${threadID} in database:`, dbError.message);
        }

        // Send welcome message
        return global.api.sendMessage(
          `👋 Hello! I'm ${global.config.botNickname || 'a Facebook Messenger Bot'}\n\n` +
          `Use ${global.config.prefix}help to see available commands.\n\n` +
          `Thank you for adding me to the group!`,
          threadID
        );
      }

      // Process each added user
      for (const participant of addedParticipants) {
        // Create or update user in database
        await global.handleCreateDatabase.createUser(participant.userFbId, participant.fullName);

        // Create currency record if it doesn't exist
        const currencyExists = await global.Currency.exists({ userID: participant.userFbId });
        if (!currencyExists) {
          await global.Currency.create({ userID: participant.userFbId });
          global.logger.database(`Created new currency record for user: ${participant.userFbId}`);
        }
      }

      // Get thread info for group name
      let threadName = "Group";
      try {
        const info = await api.getThreadInfo(threadID);
        threadName = info.threadName || "Group";
      } catch (e) {
        // Ignore
      }

      // Format welcome message
      let welcomeMessage = '👋 Welcome to the group!';
      let attachment = [];

      // Single user welcome
      if (addedParticipants.length === 1) {
        const user = addedParticipants[0];
        welcomeMessage = `👋 Welcome ${user.fullName} to ${threadName}!\n\n` +
          `We hope you enjoy your time here.\n` +
          `Use ${global.config.prefix}help to see available bot commands.`;

        // Generate Welcome Image
        try {
          const avatarUrl = `https://graph.facebook.com/${user.userFbId}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
          const imageBuffer = await generateWelcomeImage(user.fullName, threadName, avatarUrl);
          const imagePath = path.join(__dirname, `welcome_${user.userFbId}_${Date.now()}.png`);
          fs.writeFileSync(imagePath, imageBuffer);
          attachment.push(fs.createReadStream(imagePath));

          // Cleanup after sending
          setTimeout(() => {
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
          }, 30000);
        } catch (imgErr) {
          global.logger.error("Error generating welcome image:", imgErr);
        }

      }
      // Multiple users welcome
      else {
        welcomeMessage = `👋 Welcome to ${threadName}!\n\n` +
          `${addedParticipants.map(user => `• ${user.fullName}`).join('\n')}\n\n` +
          `We hope you all enjoy your time here.\n` +
          `Use ${global.config.prefix}help to see available bot commands.`;
      }

      // Send welcome message
      await global.api.sendMessage({
        body: welcomeMessage,
        attachment: attachment
      }, threadID);

      // Update thread in database with new users using thread controller
      try {
        // Get full thread info to get user details (gender, vanity, isBirthday)
        let threadInfo = null;
        try {
          threadInfo = await new Promise((resolve, reject) => {
            api.getThreadInfo(threadID, (err, info) => {
              if (err) return reject(err);
              resolve(info);
            });
          });
        } catch (threadInfoError) {
          global.logger.debug(`Could not get thread info for ${threadID}:`, threadInfoError.message);
        }

        // Process each added participant
        for (const participant of addedParticipants) {
          // Skip bot user
          if (participant.userFbId === global.client.botID) continue;

          // Try to get full user info from threadInfo
          let userInfo = null;
          if (threadInfo && threadInfo.userInfo && Array.isArray(threadInfo.userInfo)) {
            userInfo = threadInfo.userInfo.find(u => u.id === participant.userFbId);
          }

          // Get nickname from threadInfo if available
          const nickname = threadInfo?.nicknames?.[participant.userFbId] || null;

          // Add user to thread using thread controller with full info
          await global.controllers.thread.addUserToThread(
            threadID,
            participant.userFbId,
            participant.fullName,
            nickname,
            userInfo?.gender || null,
            userInfo?.vanity && userInfo.vanity.trim() !== '' ? userInfo.vanity : null
          );
        }

        global.logger.database(`Updated thread ${threadID} with ${addedParticipants.length} new users using thread controller`);
      } catch (dbError) {
        global.logger.error(`Error updating thread database for userJoin event:`, dbError.message);
      }

    } catch (error) {
      global.logger.error('Error in userJoin event:', error.message);
    }
  }
};