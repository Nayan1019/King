/**
 * Auto Download Command
 * Auto-detects video URLs and downloads them
 */

const { downloadVideo } = require("priyansh-all-dl");
const axios = require("axios");
const fs = require("fs-extra");
const tempy = require("tempy");
const { pipeline } = require("stream/promises");

const DOWNLOAD_TIMEOUT_MS = 45000;
const FILE_DOWNLOAD_TIMEOUT_MS = 60000;
const UPLOAD_RETRY_DELAY_MS = 3000;
const NETWORK_RETRY_ATTEMPTS = 3;

let autoDownloadEnabled = true; // Global toggle for auto-download
const processedMessages = new Set(); // Track processed messages to prevent duplicates

module.exports = {
  config: {
    name: 'autodownload',
    aliases: ['ad', 'autodl', 'download'],
    description: 'Auto-detects video URLs or manually download with command',
    usage: '{prefix}autodownload [on/off/URL]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: false, // Can work without prefix for auto-detection
    permission: 'PUBLIC',
    cooldown: 0,
    category: 'UTILITY'
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID } = message;
    const command = args[0]?.toLowerCase();

    // Command to toggle on/off
    if (command === 'on') {
      autoDownloadEnabled = true;
      return api.sendMessage('✅ Auto-downloading has been enabled.', threadID, messageID);
    } else if (command === 'off') {
      autoDownloadEnabled = false;
      return api.sendMessage('❌ Auto-downloading has been disabled.', threadID, messageID);
    }

    // Show status if no args provided
    if (args.length === 0) {
      const status = autoDownloadEnabled ? 'enabled' : 'disabled';
      return api.sendMessage(
        `📱 Auto-download is currently ${status}\n\n` +
        `Usage:\n` +
        `• ${global.config.prefix}autodownload on - Enable auto-download\n` +
        `• ${global.config.prefix}autodownload off - Disable auto-download\n` +
        `• ${global.config.prefix}autodownload [URL] - Download video from URL\n\n` +
        `Supported platforms: Facebook, Instagram, TikTok, Twitter/X, Threads`,
        threadID,
        messageID
      );
    }

    // If a URL is passed as an argument, download it directly
    const url = args[0];
    const patterns = {
      facebook: /^(https?:\/\/)?(www\.)?(m\.)?facebook\.com\/(share|reel|watch)\/.+$/,
      instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?:share|reel|stories)\/[^\s]+/gi,
      tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+/gi,
      twitter: /https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/[^\s]+/gi,
      threads: /https?:\/\/(?:www\.)?threads\.net\/[^\s]+/gi
    };

    let platform = null;
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) {
        platform = key;
        break;
      }
    }

    if (platform) {
      await downloadAndSend(api, message, url, platform);
    } else {
      api.sendMessage('❌ Invalid command or unsupported URL. Use `/autodownload on/off` or provide a valid video URL.', threadID, messageID);
    }
  },

  handleEvent: async function ({ api, message }) {
    try {
      if (global.config && global.config.debug) {
        try { console.log(JSON.stringify(message, null, 2)); } catch (e) { console.log(message); }
      }
      if (!autoDownloadEnabled) return;

      if (message.senderID === global.client?.botID) return;

      const { messageID, body, attachments } = message;

      if (processedMessages.has(messageID)) {
        return;
      }
      processedMessages.add(messageID);

      if (processedMessages.size > 100) {
        const oldestMessages = Array.from(processedMessages).slice(0, processedMessages.size - 100);
        oldestMessages.forEach(id => processedMessages.delete(id));
      }

      const patterns = {
        facebook: /https?:\/\/(?:www\.|m\.)?facebook\.com\/(reel|watch|share|video)\/.*/i,
        instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?:share|reel|stories)\/[^\s]+/gi,
        tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+/gi,
        twitter: /https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/[^\s]+/gi,
        threads: /https?:\/\/(?:www\.)?threads\.net\/[^\s]+/gi
      };

      let urlToDownload = null;
      let platform = null;

      const checkUrlPatterns = (url) => {
        if (!url) return null;
        if (!url.includes('http') && !url.includes('www.') && !url.includes('.com')) {
          return null;
        }

        for (const [key, pattern] of Object.entries(patterns)) {
          if (pattern.test(url)) {
            return { url, platform: key };
          }
        }
        return null;
      };

      if (body) {
        const result = checkUrlPatterns(body);
        if (result) {
          urlToDownload = result.url;
          platform = result.platform;
        }
      }

      if (!urlToDownload && attachments && attachments.length > 0) {
        for (let attachment of attachments) {
          if (attachment.url) {
            const result = checkUrlPatterns(attachment.url);
            if (result) {
              urlToDownload = result.url;
              platform = result.platform;
              break;
            }
          }

          if (attachment.source) {
            const result = checkUrlPatterns(attachment.source);
            if (result) {
              urlToDownload = result.url;
              platform = result.platform;
              break;
            }
          }

          if (attachment.href) {
            const result = checkUrlPatterns(attachment.href);
            if (result) {
              urlToDownload = result.url;
              platform = result.platform;
              break;
            }
          }

          if (attachment.target && attachment.target.url) {
            const result = checkUrlPatterns(attachment.target.url);
            if (result) {
              urlToDownload = result.url;
              platform = result.platform;
              break;
            }
          }
        }
      }

      if (!urlToDownload) {
        const resultFromMessage = checkUrlPatterns(message.url) || checkUrlPatterns(message.source);
        if (resultFromMessage) {
          urlToDownload = resultFromMessage.url;
          platform = resultFromMessage.platform;
        }
      }

      if (urlToDownload) {
        await downloadAndSend(api, message, urlToDownload, platform);
      }
    } catch (error) {
      console.error('[autodownload] handleEvent error:', error);
    }
  }
};

async function downloadAndSend(api, message, url, platform) {
  const { threadID, messageID } = message;
  let tempFilePath = null;

  const setReaction = (emoji) => {
    api.setMessageReaction(emoji, messageID, () => {}, true);
  };

  try {
    setReaction("⌛");

    const videoInfo = await safeDownloadVideo(url);
    const selection = selectVideoLink(platform, videoInfo);

    if (!selection || !selection.hdLink) {
      setReaction("❌");
      const responseMessage = selection?.errorMessage ||
        "❌ Sorry, no downloadable video link could be found for that URL.";
      return api.sendMessage(responseMessage, threadID, messageID);
    }

    tempFilePath = tempy.file({ extension: "mp4" });
    await downloadFileWithTimeout(selection.hdLink, tempFilePath);

    await sendVideoWithRetry({
      api,
      threadID,
      originalMessageID: messageID,
      body: selection.videoTitle,
      filePath: tempFilePath
    });

    setReaction("✅");
  } catch (error) {
    console.error(`Error in downloadAndSend for ${platform}:`, error);
    global.logger?.error(`Error in downloadAndSend for ${platform}:`, error.message);
    setReaction("❌");

    const isTimeout = error.message?.toLowerCase().includes('timeout') ||
      error.code === 'ECONNABORTED' ||
      error.name === 'AbortError';

    const userMessage = isTimeout
      ? `⏱️ ${platform} server took too long to respond. Please try again later.`
      : `❌ Unable to process that ${platform} video right now. Please try another link or try again later.`;

    api.sendMessage(userMessage, threadID, messageID);
  } finally {
    cleanupFile(tempFilePath);
  }
}

async function safeDownloadVideo(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const result = await Promise.race([
      downloadVideo(url),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () => {
        reject(new Error(`Download timeout after ${DOWNLOAD_TIMEOUT_MS}ms`));
      }))
    ]);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function selectVideoLink(platform, videoInfo = {}) {
  if (!videoInfo || typeof videoInfo !== 'object') {
    return { errorMessage: "❌ Unable to fetch video metadata at the moment." };
  }

  switch (platform) {
    case 'facebook': {
      const hdLink = videoInfo["720p"] || videoInfo["360p"];
      if (!hdLink || hdLink === "Not found") {
        return { errorMessage: "❌ 360p or 720p quality video is not available for that link." };
      }
      return {
        hdLink,
        videoTitle: "--『 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 🄱🄾🅃 』--\nHere's the Facebook video you requested:"
      };
    }
    case 'instagram':
      return videoInfo.video
        ? {
            hdLink: videoInfo.video,
            videoTitle: "--『 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 🄱🄾🅃 』--\nHere's the Instagram video you requested:"
          }
        : { errorMessage: "❌ Could not find a downloadable Instagram video link." };
    case 'tiktok':
      return videoInfo.video
        ? {
            hdLink: videoInfo.video,
            videoTitle: "--『 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 🄱🄾🅃 』--\nHere's the TikTok video you requested:"
          }
        : { errorMessage: "❌ Could not find a downloadable TikTok video link." };
    case 'twitter': {
      const videos = videoInfo.videos || videoInfo.Data?.videos || [];
      if (!Array.isArray(videos) || videos.length === 0) {
        return { errorMessage: "❌ No downloadable Twitter video found." };
      }
      const pickPriority = (resolution = "") => {
        const width = parseInt(resolution.split("x")[0], 10);
        if (width >= 700) return 1;
        if (width >= 400) return 2;
        return 3;
      };
      const sorted = [...videos].sort((a, b) => pickPriority(a.resolution) - pickPriority(b.resolution));
      return {
        hdLink: sorted[0].url,
        videoTitle: "--『 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 🄱🄾🅃 』--\nHere's the Twitter/X video you requested:"
      };
    }
    case 'threads': {
      const data = videoInfo.Data;
      if (!data || !data.video_url) {
        return { errorMessage: "❌ No downloadable Threads video found." };
      }
      const { username, id, title } = data;
      return {
        hdLink: data.video_url,
        videoTitle: `--『 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 🄱🄾🅃 』--\nHere's the Threads video you requested:\n\n👤 Username: ${username}\n🆔 ID: ${id}\n📝 Title: ${title}`
      };
    }
    default:
      return { errorMessage: "❌ Unsupported platform." };
  }
}

async function downloadFileWithTimeout(url, filePath) {
  let attempt = 1;

  while (attempt <= NETWORK_RETRY_ATTEMPTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FILE_DOWNLOAD_TIMEOUT_MS);

    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        signal: controller.signal,
        timeout: FILE_DOWNLOAD_TIMEOUT_MS,
        maxRedirects: 5
      });

      await pipeline(response.data, fs.createWriteStream(filePath));
      return;
    } catch (error) {
      const isTimeout = error.code === 'ESOCKETTIMEDOUT' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED' ||
        error.message?.toLowerCase().includes('timeout');

      const isNetwork = isTimeout ||
        error.code === 'ENETUNREACH' ||
        error.code === 'ECONNRESET';

      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }

      if (!isNetwork || attempt >= NETWORK_RETRY_ATTEMPTS) {
        throw error;
      }

      const backoff = UPLOAD_RETRY_DELAY_MS * attempt;
      console.warn(`[autodownload] Network issue (${error.code || error.message}), retrying in ${backoff}ms... (attempt ${attempt})`);
      await delay(backoff);
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function sendVideoWithRetry({ api, threadID, originalMessageID, body, filePath }) {
  let attempt = 1;
  while (attempt <= 2) {
    try {
      const payload = {
        body,
        attachment: fs.createReadStream(filePath)
      };
      await sendAttachment(api, threadID, payload, originalMessageID);
      return;
    } catch (error) {
      const errText = String(error?.message || error);
      const is408 = errText.includes('status code: 408');

      if (is408 && attempt < 2) {
        await delay(UPLOAD_RETRY_DELAY_MS);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}

function sendAttachment(api, threadID, payload, originalMessageID) {
  return new Promise((resolve, reject) => {
    api.sendMessage(payload, threadID, (err, info) => {
      if (err) {
        if (info && (info.messageID || info.threadID)) {
          return resolve(info);
        }
        return reject(err);
      }
      resolve(info);
    }, originalMessageID);
  });
}

function cleanupFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[autodownload] Failed to cleanup temp file:', error);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
