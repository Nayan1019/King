/**
 * Rankup Command
 * Notifies users when they level up
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports = {
  config: {
    name: 'rankup',
    description: 'Notifies users when they level up',
    usage: 'Automatic',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: false,
    permission: 'PUBLIC',
    cooldown: 0,
    isHidden: true
  },

  run: async function ({ api, message }) {
    const { threadID, senderID } = message;

    try {
      if (!global.client.rankups || !global.client.rankups.has(senderID)) {
        return;
      }

      const rankupData = global.client.rankups.get(senderID);
      global.client.rankups.delete(senderID);

      await sendLevelUpNotification(api, threadID, senderID, rankupData);
    } catch (error) {
      global.logger.error('Error in rankup notification:', error.message);
    }
  },

  init: function (api) {
    if (!global.client.rankupListenerActive) {
      global.client.rankupListenerActive = true;
      let isProcessing = false;

      setInterval(async () => {
        if (isProcessing) return; // Prevent overlapping executions
        isProcessing = true;

        try {
          if (!global.client.rankups || global.client.rankups.size === 0) {
            return;
          }

          // Create a copy of the entries to iterate over safely
          const rankupsToProcess = new Map(global.client.rankups);

          // Clear the global map immediately to prevent re-processing in next interval
          // If new rankups come in during processing, they will be added to the empty global map
          for (const [userID] of rankupsToProcess) {
            global.client.rankups.delete(userID);
          }

          for (const [userID, rankupData] of rankupsToProcess.entries()) {
            try {
              const user = await global.User.findOne({ userID });
              global.logger.debug(`Rankup for user ${userID}: ${JSON.stringify(user || 'User not found')}`);

              if (!user) {
                global.logger.error(`Cannot send rankup notification: User ${userID} not found`);
                continue;
              }

              if (!user.lastThreadID) {
                const recentThread = await global.Thread.findOne(
                  { 'users.id': userID },
                  {},
                  { sort: { 'lastActive': -1 } }
                );

                if (recentThread) {
                  user.lastThreadID = recentThread.threadID;
                  await user.save();
                  await sendLevelUpNotification(api, recentThread.threadID, userID, rankupData);
                } else {
                  // No thread found, cannot notify
                  continue;
                }
              } else {
                await sendLevelUpNotification(api, user.lastThreadID, userID, rankupData);
              }

            } catch (err) {
              global.logger.error(`Error processing rankup for user ${userID}: ${err.message}`);
            }
          }
        } catch (error) {
          global.logger.error('Error in rankup listener:', error.message);
        } finally {
          isProcessing = false;
        }
      }, 5000);

      global.logger.system('Rankup listener initialized');
    }
  }
};

async function sendLevelUpNotification(api, threadID, userID, rankupData) {
  try {
    // --- CANVAS GENERATION ---
    const width = 1200;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Random Themes (Same as rank.js)
    const themes = [
      { bgStart: '#0f0c29', bgMid: '#302b63', bgEnd: '#24243e', accent: '#00f2ff', secondary: '#00c6ff', glow: '#0072ff' },
      { bgStart: '#200122', bgMid: '#6f0000', bgEnd: '#c94b4b', accent: '#ff9966', secondary: '#ff5e62', glow: '#ff0000' },
      { bgStart: '#000000', bgMid: '#0f2027', bgEnd: '#203a43', accent: '#00ff99', secondary: '#66ff00', glow: '#39ff14' },
      { bgStart: '#141e30', bgMid: '#243b55', bgEnd: '#141e30', accent: '#ffd700', secondary: '#fdb931', glow: '#ffb347' },
      { bgStart: '#232526', bgMid: '#414345', bgEnd: '#232526', accent: '#E0EAFC', secondary: '#CFDEF3', glow: '#ffffff' }
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.bgStart);
    gradient.addColorStop(0.5, theme.bgMid);
    gradient.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Shapes
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 80, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Glassmorphism Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(50, 50, width - 100, height - 100, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Avatar
    const fbToken = global.config.facebookToken || "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${fbToken}`;

    try {
      const avatarBuffer = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
      const avatar = await loadImage(avatarBuffer.data);

      const avatarX = 100;
      const avatarY = 85;
      const avatarSize = 230;

      // Glow
      ctx.save();
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      // Image
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Border
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
      ctx.lineWidth = 8;
      ctx.strokeStyle = theme.accent;
      ctx.stroke();
    } catch (err) {
      console.error("Failed to load avatar", err);
    }

    // Text Info
    ctx.fillStyle = '#ffffff';

    // Header
    ctx.font = 'bold 60px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText("LEVEL UP!", 380, 140);

    // Name
    ctx.font = 'bold 50px sans-serif';
    ctx.fillStyle = theme.accent;
    let displayName = rankupData.name;
    if (ctx.measureText(displayName).width > 700) {
      while (ctx.measureText(displayName + '...').width > 700) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }
    ctx.fillText(displayName, 380, 210);

    // Level Info
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`You reached Level ${rankupData.level}!`, 380, 280);

    // Bonus Info (Right aligned)
    ctx.font = '30px sans-serif';
    ctx.fillStyle = theme.secondary;
    const bonusText = `+${rankupData.level * 100} Coins`;
    ctx.fillText(bonusText, width - ctx.measureText(bonusText).width - 80, 350);

    // Save Image
    const tempDir = path.join(__dirname, 'temporary');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const pathImg = path.join(tempDir, `rankup_${userID}.png`);
    fs.writeFileSync(pathImg, canvas.toBuffer());

    // Message Body
    const msgBody = `🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣! 🎉\n\nCongratulations ${rankupData.name}!\nYou have reached Level ${rankupData.level}!\n\n💰 Bonus: ${rankupData.level * 100} coins\n🏦 Bank Capacity: ${rankupData.bankCapacity}`;

    // Send
    await api.sendMessage({
      body: msgBody,
      attachment: fs.createReadStream(pathImg),
      mentions: [{ tag: rankupData.name, id: userID }]
    }, threadID, () => fs.unlinkSync(pathImg));

    global.logger.system(`Sent level up notification for ${rankupData.name} (${userID}) in thread ${threadID}`);
  } catch (error) {
    global.logger.error(`Error sending level up notification: ${error.message}`);
  }
}