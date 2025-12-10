/**
 * Join Command
 * List all groups and allow user to join one by replying with the number
 */

module.exports = {
    config: {
        name: "join",
        aliases: ["joingroup"],
        description: "List all groups and join one by replying with the number",
        usage: "{prefix}join",
        credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
        hasPrefix: true,
        permission: "ADMIN",
        category: "ADMIN",
        cooldown: 5
    },

    run: async function ({ api, message, args }) {
        const { threadID, messageID, senderID } = message;

        try {
            // Get all threads from database
            // Using global.Thread as seen in thread.js
            const threads = await global.Thread.find({}).sort({ threadName: 1 });

            if (threads.length === 0) {
                return api.sendMessage("❌ No groups found in the database.", threadID, messageID);
            }

            // Format the list with index numbers
            let msg = `📋 Available Groups (${threads.length}):\n\n`;

            threads.forEach((thread, index) => {
                const name = thread.threadName || "Unnamed Group";
                const memberCount = thread.participantIDs ? thread.participantIDs.length : "Unknown";
                msg += `${index + 1}. ${name}\n   ID: ${thread.threadID}\n   Members: ${memberCount}\n\n`;
            });

            msg += '👉 Reply to this message with the number of the group you want to join.';

            // Send the list and store the reply handler
            api.sendMessage(msg, threadID, (err, info) => {
                if (err) return console.error('Error sending message:', err);

                // Store thread list in global client replies for later actions
                // Using the structure found in thread.js and handleReply.js
                global.client.replies.set(threadID, [
                    ...(global.client.replies.get(threadID) || []),
                    {
                        messageID: info.messageID,
                        command: this.config.name,
                        expectedSender: senderID,
                        data: {
                            threads
                        }
                    }
                ]);
            });

        } catch (error) {
            console.error("Error in join command:", error);
            return api.sendMessage("❌ An error occurred while fetching groups.", threadID, messageID);
        }
    },

    handleReply: async function ({ api, message, replyData }) {
        const { threadID, messageID, body, senderID } = message;
        const { threads } = replyData;

        // Check if the replier is the one who requested the list
        // This is already checked by handleReply.js via expectedSender, but good to double check or if we want custom message
        // Actually handleReply.js filters by expectedSender if it's set.

        const index = parseInt(body.trim());

        if (isNaN(index) || index < 1 || index > threads.length) {
            return api.sendMessage(`❌ Invalid number. Please reply with a number between 1 and ${threads.length}.`, threadID, messageID);
        }

        const selectedThread = threads[index - 1];
        const targetThreadID = selectedThread.threadID;
        const targetThreadName = selectedThread.threadName || "Unnamed Group";

        try {
            api.sendMessage(`🔄 Attempting to add you to group: "${targetThreadName}"...`, threadID, (err, info) => {
                if (err) return console.error(err);

                api.addUserToGroup(senderID, targetThreadID, (err) => {
                    if (err) {
                        console.error("Error adding user to group:", err);
                        return api.editMessage(`❌ Failed to add you to "${targetThreadName}".\nPossible reasons:\n- The group is full.\n- The bot is not an admin in that group.\n- You have blocked the bot or the group.\n- Facebook limits.`, info.messageID);
                    }
                    api.editMessage(`✅ Successfully added you to "${targetThreadName}"!`, info.messageID);
                });
            });

        } catch (error) {
            console.error("Error in join command reply:", error);
            return api.sendMessage("❌ An error occurred while trying to join the group.", threadID, messageID);
        }
    }
};
