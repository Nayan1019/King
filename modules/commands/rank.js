const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

// --- REGISTER FONTS GLOBALLY ---
const fontPathBold = path.join(__dirname, 'fonts', 'Poppins-Bold.ttf');
const fontPathRegular = path.join(__dirname, 'fonts', 'Poppins-Regular.ttf');

if (fs.existsSync(fontPathBold)) {
  registerFont(fontPathBold, { family: 'Poppins', weight: 'bold' });
}
if (fs.existsSync(fontPathRegular)) {
  registerFont(fontPathRegular, { family: 'Poppins', weight: 'normal' });
}

/**
 * Rank Command
 * Shows user's rank, experience, level, and message count
 */

module.exports = {
  config: {
    name: 'rank',
    aliases: ['level', 'exp', 'experience'],
    description: 'Check your rank, level, experience, and message count',
    usage: '{prefix}rank [@mention]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;

    try {
      // Determine which user to check (self or mentioned)
      let targetID = senderID;
      let targetName = '';

      if (Object.keys(mentions).length > 0) {
        const mentionKeys = Object.keys(mentions);
        targetID = mentionKeys[0];
        targetName = mentions[targetID].replace('@', '');
      }

      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage('❌ User not found in database.', threadID, messageID);
      }

      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      if (!currency) {
        return api.sendMessage('❌ User currency data not found.', threadID, messageID);
      }

      // Get thread data to check message count
      const thread = await global.Thread.findOne({ threadID });
      const messageCount = thread ? (thread.messageCount.get(targetID) || 0) : 0;

      // Calculate XP needed for next level
      let xpNeededForNextLevel;
      if (currency.level === 1) {
        xpNeededForNextLevel = 40;
      } else if (currency.level === 2) {
        xpNeededForNextLevel = 60;
      } else if (currency.level === 3) {
        xpNeededForNextLevel = 80;
      } else {
        xpNeededForNextLevel = currency.level * 20;
      }

      const currentExp = currency.exp;
      const level = currency.level;
      const name = targetName || user.name;

      // --- CANVAS GENERATION ---

      // 1. Setup Canvas (High Resolution)
      const width = 1200;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // --- RANDOM THEMES ---
      const themes = [
        { // Deep Purple & Blue
          bgStart: '#0f0c29', bgMid: '#302b63', bgEnd: '#24243e',
          accent: '#00f2ff', secondary: '#00c6ff', glow: '#0072ff'
        },
        { // Fiery Red & Orange
          bgStart: '#200122', bgMid: '#6f0000', bgEnd: '#c94b4b',
          accent: '#ff9966', secondary: '#ff5e62', glow: '#ff0000'
        },
        { // Cyberpunk Neon
          bgStart: '#000000', bgMid: '#0f2027', bgEnd: '#203a43',
          accent: '#00ff99', secondary: '#66ff00', glow: '#39ff14'
        },
        { // Royal Gold & Black
          bgStart: '#141e30', bgMid: '#243b55', bgEnd: '#141e30',
          accent: '#ffd700', secondary: '#fdb931', glow: '#ffb347'
        },
        { // Midnight City
          bgStart: '#232526', bgMid: '#414345', bgEnd: '#232526',
          accent: '#E0EAFC', secondary: '#CFDEF3', glow: '#ffffff'
        }
      ];

      const theme = themes[Math.floor(Math.random() * themes.length)];

      // 2. Background - Random Premium Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, theme.bgStart);
      gradient.addColorStop(0.5, theme.bgMid);
      gradient.addColorStop(1, theme.bgEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add decorative random geometric shapes
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ffffff';

      // Random Circles
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Random Lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0; // Reset alpha

      // Glassmorphism Card Overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(50, 50, width - 100, height - 100, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Avatar with Glow
      const fbToken = global.config.facebookToken || "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${fbToken}`;

      try {
        const avatarBuffer = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
        const avatar = await loadImage(avatarBuffer.data);

        const avatarX = 100;
        const avatarY = 85;
        const avatarSize = 230;

        // Glow effect behind avatar
        ctx.save();
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();

        // Draw Avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Avatar Border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.lineWidth = 8;
        ctx.strokeStyle = theme.accent;
        ctx.stroke();
      } catch (err) {
        console.error("Failed to load avatar", err);
      }

      // 4. Text Info
      ctx.fillStyle = '#ffffff';

      // Name
      ctx.font = 'bold 70px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      let displayName = name;
      if (ctx.measureText(displayName).width > 600) {
        while (ctx.measureText(displayName + '...').width > 600) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      ctx.fillText(displayName, 380, 160);
      ctx.shadowBlur = 0; // Reset shadow

      // Rank & Level Info
      ctx.font = '40px sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.fillText(`Level: ${level}`, 380, 220);

      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`Rank: Member`, 600, 220); // Adjust position as needed

      // XP Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '35px sans-serif';
      const xpText = `${currentExp} / ${xpNeededForNextLevel} XP`;
      ctx.fillText(xpText, width - ctx.measureText(xpText).width - 100, 220);

      // 5. Progress Bar
      const barX = 380;
      const barY = 260;
      const barWidth = 720;
      const barHeight = 40;
      const radius = 20;

      // Empty Bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      ctx.fill();

      // Filled Bar with Gradient
      const progress = Math.min(1, Math.max(0, currentExp / xpNeededForNextLevel));
      if (progress > 0) {
        const filledWidth = Math.max(radius * 2, barWidth * progress);
        const barGradient = ctx.createLinearGradient(barX, 0, barX + filledWidth, 0);
        barGradient.addColorStop(0, theme.secondary);
        barGradient.addColorStop(1, theme.accent);

        ctx.fillStyle = barGradient;
        ctx.beginPath();
        ctx.roundRect(barX, barY, filledWidth, barHeight, radius);
        ctx.fill();

        // Glow
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Save Image to Temp
      const tempDir = path.join(__dirname, 'temporary');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const pathImg = path.join(tempDir, `rank_${targetID}.png`);
      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);

      // 7. Construct Text Message
      const progressBarLength = 10;
      const progressPercentage = Math.min(100, Math.floor((currentExp / xpNeededForNextLevel) * 100));
      const filledBlocks = Math.floor((progressPercentage / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

      const responseText = `👤 𝗥𝗔𝗡𝗞 𝗜𝗡𝗙𝗢 - ${name}

📊 Level: ${level}
✨ XP: ${currentExp}/${xpNeededForNextLevel}
⏳ Progress: ${progressBar} ${progressPercentage}%
💰 Money: ${currency.money}
🏦 Bank: ${currency.bankCapacity}
💬 Messages: ${messageCount}`;

      // 8. Send Message with Attachment
      await api.sendMessage({
        body: responseText,
        attachment: fs.createReadStream(pathImg)
      }, threadID, () => fs.unlinkSync(pathImg), messageID);

    } catch (error) {
      global.logger.error('Error in rank command:', error.message);
      return api.sendMessage('❌ An error occurred while generating the rank card.', threadID, messageID);
    }
  }
};