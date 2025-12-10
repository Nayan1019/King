const MAX_USERS_PER_MESSAGE = 20;

module.exports = {
  config: {
    name: 'friendlist',
    aliases: ['flist', 'friendreq'],
    description: 'List pending friend requests with ability to accept via reply',
    usage: '{prefix}friendlist',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 5,
    category: 'SOCIAL'
  },

  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    const page = parseInt(args[0], 10) || 1;

    try {
      const pendingFriends = await new Promise((resolve, reject) => {
        api.getPendingFriendRequests((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      const totalFriends = pendingFriends.length;
      const totalPages = Math.ceil(totalFriends / MAX_USERS_PER_MESSAGE);

      if (totalFriends === 0) {
        return api.sendMessage('✅ No pending friend requests!', threadID, messageID);
      }

      const startIndex = (page - 1) * MAX_USERS_PER_MESSAGE;
      const endIndex = Math.min(startIndex + MAX_USERS_PER_MESSAGE, totalFriends);

      let msg = `👥 **Pending Friend Requests (Page ${page}/${totalPages}):**\n\n`;
      pendingFriends.slice(startIndex, endIndex).forEach((user, index) => {
        const userName = user.name || 'Unknown User';
        const userID = user.userID;

        msg += `${startIndex + index + 1}. ${userName} (${userID})\n`;
      });

      msg += `\n💡 **How to accept:**\n`;
      msg += `Reply to this message with index numbers to accept requests.\n`;
      msg += `Example: "1" or "1 2 3"`;

      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return global.logger.error('Error sending message:', err);

        if (!global.client.replies) {
          global.client.replies = new Map();
        }

        const currentReplies = global.client.replies.get(threadID) || [];
        currentReplies.push({
          messageID: info.messageID,
          command: this.config.name,
          expectedSender: senderID,
          data: {
            users: pendingFriends,
            type: 'user',
            page: page
          },
          createdAt: Date.now()
        });

        global.client.replies.set(threadID, currentReplies);

        setTimeout(() => {
          const replies = global.client.replies.get(threadID) || [];
          const updatedReplies = replies.filter(reply =>
            reply.messageID !== info.messageID
          );

          if (updatedReplies.length > 0) {
            global.client.replies.set(threadID, updatedReplies);
          } else {
            global.client.replies.delete(threadID);
          }
        }, 10 * 60 * 1000);
      });

    } catch (error) {
      global.logger.error('Error fetching friend requests:', error);
      return api.sendMessage('❌ Error fetching friend requests.', threadID, messageID);
    }
  },


  /**
   * Handle replies to the friendlist
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Object} options.replyData - Data from the original message
   */
  handleReply: async function({ api, message, replyData }) {
    const { threadID, messageID, body, senderID } = message;

    if (!replyData) {
      return api.sendMessage('❌ Error: Reply data is missing.', threadID, messageID);
    }

    const { users, page } = replyData;
    const startIndex = (page - 1) * MAX_USERS_PER_MESSAGE;

    const indexNumbers = body.trim().split(/\s+/)
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num) && num > 0 && num <= users.length);

    if (indexNumbers.length === 0) {
      return api.sendMessage(
        `❌ Invalid input. Please provide valid index numbers (1-${users.length}).\n` +
        `Example: "1" or "1 2 3"`,
        threadID,
        messageID
      );
    }

    try {
      for (const index of indexNumbers) {
        const user = users[startIndex + index - 1];
        await api.handleFriendRequest(user.userID, true);
      }

      api.sendMessage('✅ Friend requests accepted!', threadID, messageID);

    } catch (error) {
      global.logger.error('Error accepting friend requests:', error);
      return api.sendMessage('❌ Error accepting some friend requests.', threadID, messageID);
    }
  }
};

