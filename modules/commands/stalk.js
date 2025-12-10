/**
 * Stalk Command
 * Gets detailed information about a Facebook user including their profile picture
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const fsp = fs.promises;

const API_ENDPOINT = "https://priyanshuapi.xyz/api/runner/fb-stalk/stalk";

function preventLinkPreview(value) {
  if (!value || value === "No data") return value;
  return value.replace(/https?:\/\/\S+/gi, (url) => url.replace("://", "://\u200b"));
}

module.exports = {
  config: {
    name: 'stalk',
    aliases: ['userinfo', 'whois'],
    description: 'Get detailed information about a Facebook user',
    usage: '{prefix}stalk [@mention] or {prefix}stalk (reply to a message) or {prefix}stalk [profile_url]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    cooldown: 5,
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'UTILITY'
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = message;
    
    try {
      let userId = null;
      let targetLink = null;
      
      if (Object.keys(mentions).length > 0) {
        userId = Object.keys(mentions)[0];
      } else if (messageReply) {
        userId = messageReply.senderID;
      } else if (args.length > 0 && /^\d+$/.test(args[0])) {
        userId = args[0];
      } else if (args.length > 0 && args[0].match(/(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/(?:profile\.php\?id=|[\w.]+)/)) {
        targetLink = normalizeFacebookLink(args[0]);
      } else if (args.length === 0) {
        userId = senderID;
      } else {
        return api.sendMessage(
          '❓ Usage:\n' +
          '- /stalk - Get your own info\n' +
          '- /stalk @mention - Get info of mentioned user\n' +
          '- /stalk [UID] - Get info of specific user ID\n' +
          '- /stalk (reply to a message) - Get info of the user who sent that message\n' +
          '- /stalk [Facebook profile URL] - Get info from profile link',
          threadID, messageID
        );
      }
      
      const payload = targetLink ? { link: targetLink } : { userId: String(userId) };
      if (!payload.link && !payload.userId) {
        return api.sendMessage('❌ Unable to determine which user to stalk. Please provide a valid mention, reply, UID, or link.', threadID, messageID);
      }
      
      const processingMsg = await api.sendMessage('🔍 Fetching user information...', threadID);
      
      const apiKey = global.config?.apiKeys?.priyanshuApi;
      if (!apiKey) {
        return api.sendMessage('⚠️ Priyanshu API key is not configured in config.json. Please add apiKeys.priyanshuApi and try again.', threadID, messageID);
      }
      const response = await axios.post(API_ENDPOINT, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || 'Failed to fetch user information');
      }
      
      const userData = response.data.data;
      const formattedBody = userData.formattedMessage || buildFormattedMessage(userData);
      const mentionsPayload = Array.isArray(userData.mentions) && userData.mentions.length > 0
        ? userData.mentions.map(item => ({
            tag: item.tag || userData.name || "Facebook User",
            id: item.id || userData.userId || userId || senderID
          }))
        : [{
            tag: userData.name || "Facebook User",
            id: userData.userId || userId || senderID
          }];
      
      let attachmentStream = null;
      let profilePicPath = null;
      
      if (userData.profilePictureUrl) {
        try {
          const downloadDir = path.join(__dirname, "temporary");
          await fsp.mkdir(downloadDir, { recursive: true });
          profilePicPath = path.join(downloadDir, `profile_${userData.userId || userId || Date.now()}.jpg`);
          const profilePicFileName = path.basename(profilePicPath);
          
          const picResponse = await axios.get(userData.profilePictureUrl, {
            responseType: "arraybuffer",
            headers: { Accept: "image/jpeg,image/png,*/*" },
            timeout: 15000
          });
          
          const imageBuffer = Buffer.from(picResponse.data);
          await fsp.writeFile(profilePicPath, imageBuffer);
          
          attachmentStream = Readable.from(imageBuffer);
          attachmentStream.path = profilePicFileName;
          attachmentStream.filename = profilePicFileName;
        } catch (picError) {
          console.error('Failed to download profile picture:', picError?.message || picError);
        }
      }
      
      api.unsendMessage(processingMsg.messageID);
      
      const messagePayload = {
        body: formattedBody,
        mentions: mentionsPayload
      };
      
      if (attachmentStream) {
        messagePayload.attachment = attachmentStream;
      }
      
      await api.sendMessage(messagePayload, threadID, null, messageID);
      
      if (profilePicPath) {
        await fsp.unlink(profilePicPath).catch((err) => {
          console.error('Error deleting profile picture:', err);
        });
      }
      
    } catch (error) {
      global.logger.error('Error in stalk command:', error?.message || error);
      
      if (error.response && error.response.status === 401) {
        return api.sendMessage('❌ API authentication failed. Please check your API key configuration.', threadID, messageID);
      }
      
      if (error.response && error.response.status === 404) {
        return api.sendMessage('❌ User not found. Please check the user ID or profile link.', threadID, messageID);
      }
      
      if (error.message?.toLowerCase().includes('timeout')) {
        return api.sendMessage('⏱️ The Facebook servers took too long to respond. Please try again later.', threadID, messageID);
      }
      
      return api.sendMessage('❌ An error occurred while fetching user information. Please try again.', threadID, messageID);
    }
  }
};

function normalizeFacebookLink(link) {
  if (!link) return link;
  let normalized = link.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function buildFormattedMessage(data = {}) {
  const safeWebsite = preventLinkPreview(data.website || "No data");
  const safeLink = preventLinkPreview(data.link || "No data");
  
  return (
    `👤 𝐍𝐚𝐦𝐞: ${data.name || "No data"}\n` +
    `🆔 𝐈𝐃: ${data.userId || "No data"}\n` +
    `📛 𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞: ${data.username || "No data"}\n` +
    `🎂 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲: ${data.birthday || "No data"}\n` +
    `⚤ 𝐆𝐞𝐧𝐝𝐞𝐫: ${data.gender || "No data"}\n` +
    `💑 𝐑𝐞𝐥𝐚𝐭𝐢𝐨𝐧𝐬𝐡𝐢𝐩 𝐒𝐭𝐚𝐭𝐮𝐬: ${data.relationshipStatus || "No data"}\n` +
    `ℹ️ 𝐀𝐛𝐨𝐮𝐭: ${data.about || "No data"}\n` +
    `🏡 𝐇𝐨𝐦𝐞𝐭𝐨𝐰𝐧: ${data.hometown || "No data"}\n` +
    `📍 𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: ${data.location || "No data"}\n` +
    `🌐 𝐖𝐞𝐛𝐬𝐢𝐭𝐞: ${safeWebsite}\n` +
    `🔗 𝐋𝐢𝐧𝐤: ${safeLink}\n` +
    `💬 𝐒𝐭𝐚𝐭𝐮𝐬: ${data.quotes || "No data"}\n` +
    `❤️ 𝐑𝐞𝐥𝐚𝐭𝐢𝐨𝐧𝐬𝐡𝐢𝐩 𝐰𝐢𝐭𝐡: ${data.significantOther || "No data"}\n` +
    `👥 𝐓𝐨𝐭𝐚𝐥 𝐅𝐨𝐥𝐥𝐨𝐰𝐞𝐫𝐬: ${data.subscribersCount ?? "No data"}`
  );
}
