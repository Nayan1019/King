const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: 'files',
    aliases: ['listfiles', 'cmdfiles'],
    description: 'Lists all files in the commands folder with indexing',
    usage: '{prefix}files [noprefix]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 10,
    category: 'SYSTEM'
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;

    try {
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }

      const commandsDir = path.join(process.cwd(), 'modules', 'commands');
      let targetDir = commandsDir;
      let isNoPrefix = false;

      if (args[0]?.toLowerCase() === 'noprefix') {
        targetDir = path.join(commandsDir, 'noprefix');
        isNoPrefix = true;
      }

      if (!fs.existsSync(targetDir)) {
        return api.sendMessage(`❌ Directory not found: ${targetDir}`, threadID, messageID);
      }

      const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.js')).sort();
      if (files.length === 0) {
        return api.sendMessage(`📂 No JavaScript files found in ${isNoPrefix ? 'noprefix' : 'commands'} folder.`, threadID, messageID);
      }

      let fileList = `📂 ${isNoPrefix ? 'NoPrefix' : 'Commands'} Files (${files.length}):\n\n`;
      for (let i = 0; i < files.length; i++) {
        fileList += `${i + 1}. ${files[i]}\n`;
      }
      fileList += `\n💡 Reply with file numbers to delete (e.g., "1 2 3").`;

      return api.sendMessage(fileList, threadID, (err, info) => {
        const replies = global.client.replies.get(threadID) || [];
        replies.push({
          command: module.exports.config.name,
          messageID: info.messageID,
          expectedSender: senderID,
          files,
          targetDir
        });
        global.client.replies.set(threadID, replies);
      }, messageID);

    } catch (err) {
      console.error('[FILES COMMAND ERROR]', err);
      return api.sendMessage('❌ An error occurred while listing files.', threadID, messageID);
    }
  },

  handleReply: async function ({ api, message }) {
    const { threadID, messageID, senderID, body, messageReply } = message;

    const replies = global.client.replies.get(threadID) || [];
    const reply = replies.find(r => r.messageID === messageReply?.messageID && r.expectedSender === senderID);

    if (!reply) return;

    // Remove old handler
    const updated = replies.filter(r => r.messageID !== messageReply.messageID);
    global.client.replies.set(threadID, updated);

    const indices = body.split(/\s+/).map(x => parseInt(x)).filter(x => !isNaN(x) && x > 0 && x <= reply.files.length);
    if (indices.length === 0)
      return api.sendMessage('❌ Invalid file numbers provided.', threadID, messageID);

    const filesToDelete = indices.map(i => reply.files[i - 1]);
    let deleted = 0, failed = 0, failedFiles = [];

    for (const file of filesToDelete) {
      const filePath = path.join(reply.targetDir, file);
      try {
        fs.unlinkSync(filePath);
        deleted++;
      } catch (e) {
        failed++;
        failedFiles.push(file);
      }
    }

    let result = `🗑️ Deletion Result:\n✅ Deleted: ${deleted} file(s)`;
    if (failed > 0) result += `\n❌ Failed: ${failed}\n${failedFiles.join('\n')}`;

    return api.sendMessage(result, threadID, messageID);
  }
};
