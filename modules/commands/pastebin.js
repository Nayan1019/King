const fs = require('fs');
const path = require('path');
const { PasteClient } = require('pastebin-api');
const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");

module.exports = {
  config: {
    name: 'pastebin',
    aliases: ['adc', 'pb'],
    description: 'Generates a pastebin link for any file',
    usage: '{prefix}pastebin [file_path or command_name]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'ADMIN',
    cooldown: 3,
    category: 'UTILITY'
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;

    try {
      if (!global.config.adminIDs.includes(senderID) && senderID !== global.config.ownerID) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }

      if (args.length === 0) {
        return api.sendMessage(
          '❌ Please provide a file path or command name.\n' +
          `Usage:\n` +
          `• ${global.config.prefix}pastebin [command_name]\n` +
          `• ${global.config.prefix}pastebin global [file_path]`,
          threadID,
          messageID
        );
      }

      let filePath = args.join(' ');
      let fileExtension = '';
      const isGlobal = filePath.startsWith('global ');

      if (isGlobal) {
        filePath = filePath.replace('global ', '').trim();
        filePath = path.join(process.cwd(), filePath);
      } else if (!filePath.includes('/') && !filePath.includes('\\')) {
        if (!filePath.endsWith('.js')) {
          filePath += '.js';
        }
        filePath = path.join(process.cwd(), 'modules', 'commands', filePath);
      }

      if (!fs.existsSync(filePath)) {
        return api.sendMessage(`❌ File not found: ${filePath}`, threadID, messageID);
      }

      // api.sendMessage('🔄 Generating Pastebin link...', threadID, messageID);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      fileExtension = path.extname(fileName).substring(1).toLowerCase();

      const formatMap = {
        'js': 'javascript',
        'html': 'html5',
        'css': 'css',
        'py': 'python',
        'php': 'php',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'json': 'json',
        'xml': 'xml',
        'sql': 'sql',
        'rb': 'ruby',
        'go': 'go',
        'ts': 'typescript',
        'sh': 'bash',
        'bat': 'batch',
        'md': 'markdown'
      };

      const format = formatMap[fileExtension] || 'text';

      const url = await client.createPaste({
        code: fileContent,
        expireDate: 'N',
        format,
        name: fileName,
        publicity: 1
      });

      const rawUrl = url.replace('pastebin.com/', 'pastebin.com/raw/');

      return api.sendMessage(
        `✅ Pastebin link generated successfully!\n\n` +
        `📄 File: ${fileName}\n` +
        `🔗 Link: ${url}\n` +
        `📝 Raw URL: ${rawUrl}\n` +
        `📋 Format: ${format}\n\n` +
        `⏱️ This link will never expire.`,
        threadID,
        messageID
      );

    } catch (error) {
      global.logger?.error('Error in pastebin command:', error.message);
      return api.sendMessage('❌ An error occurred while generating the pastebin link.', threadID, messageID);
    }
  }
};
