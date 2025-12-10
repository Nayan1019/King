const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");

// Curated list of vibrant, attractive color palettes
const PALETTES = [
    { name: "Cosmic Fusion", stops: ["#8E2DE2", "#4A00E0", "#00C9FF"], accent: "#FFD700" },
    { name: "Sunset Vibes", stops: ["#FF512F", "#DD2476", "#FF9966"], accent: "#FFFFFF" },
    { name: "Ocean Blue", stops: ["#2193b0", "#6dd5ed", "#005bea"], accent: "#76FF03" },
    { name: "Lush Green", stops: ["#11998e", "#38ef7d", "#00b09b"], accent: "#FFD700" },
    { name: "Royal Gold", stops: ["#BF953F", "#FCF6BA", "#B38728", "#FBF5B7", "#AA771C"], accent: "#FFFFFF" }, // Gold gradient
    { name: "Neon Cyber", stops: ["#f12711", "#f5af19", "#ff00cc"], accent: "#00FFFF" },
    { name: "Midnight City", stops: ["#232526", "#414345", "#2C3E50"], accent: "#00C9FF" },
    { name: "Berry Smoothie", stops: ["#833ab4", "#fd1d1d", "#fcb045"], accent: "#FFFFFF" },
    { name: "Northern Lights", stops: ["#43C6AC", "#191654", "#F8FFAE"], accent: "#FFFFFF" }
];

/**
 * Get a random palette
 */
function getRandomPalette() {
    return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

/**
 * Generate a welcome image for a new user
 * @param {string} userName - Name of the user
 * @param {string} groupName - Name of the group
 * @param {string} avatarUrl - URL of the user's avatar
 * @returns {Promise<Buffer>} - Buffer of the generated image
 */
async function generateWelcomeImage(userName, groupName, avatarUrl) {
    // Canvas dimensions
    const width = 1024;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Select a random palette
    const palette = getRandomPalette();

    // --- Background ---
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    // Distribute stops evenly
    palette.stops.forEach((color, index) => {
        gradient.addColorStop(index / (palette.stops.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // --- Abstract Shapes (Dynamic & Random) ---
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#FFFFFF";

    // Randomize shape positions slightly
    const shapeOffset = Math.random() * 50;

    // Large circle top-left
    ctx.beginPath();
    ctx.arc(0 + shapeOffset, 0 + shapeOffset, 300, 0, Math.PI * 2);
    ctx.fill();

    // Large circle bottom-right
    ctx.beginPath();
    ctx.arc(width - shapeOffset, height - shapeOffset, 400, 0, Math.PI * 2);
    ctx.fill();

    // Floating bubbles/particles
    for (let i = 0; i < 25; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 25 + 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add some diagonal lines for texture
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - 200, height);
        ctx.stroke();
    }

    ctx.restore();

    // --- Glassmorphism Card ---
    const cardWidth = 850;
    const cardHeight = 380;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;
    const borderRadius = 40;

    ctx.save();
    // Card background with transparency and blur simulation
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.fill();

    // Card border (gradient border simulation)
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    // Card shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;
    ctx.restore();

    // --- Avatar ---
    const avatarSize = 180;
    const avatarX = width / 2;
    const avatarY = cardY + 110;

    try {
        const avatar = await loadImage(avatarUrl);

        ctx.save();
        // Circular clip
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // Avatar Border (Glowing with accent color)
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#ffffff";
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();

    } catch (err) {
        // Fallback placeholder
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#cccccc";
        ctx.fill();
    }

    // --- Text ---
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 8;

    // "WELCOME"
    ctx.font = "bold 26px Sans";
    ctx.fillStyle = palette.accent; // Use palette accent
    ctx.fillText("WELCOME TO THE GROUP", width / 2, avatarY + avatarSize / 2 + 50);

    // User Name
    ctx.font = "bold 55px Sans";
    ctx.fillStyle = "#ffffff";
    let displayName = userName;
    if (displayName.length > 18) {
        displayName = displayName.substring(0, 16) + "...";
    }
    ctx.fillText(displayName, width / 2, avatarY + avatarSize / 2 + 110);

    // Group Name
    ctx.font = "italic 30px Sans";
    ctx.fillStyle = "#E0E0E0";
    let displayGroup = groupName;
    if (displayGroup.length > 28) {
        displayGroup = displayGroup.substring(0, 26) + "...";
    }
    ctx.fillText(displayGroup, width / 2, avatarY + avatarSize / 2 + 155);

    return canvas.toBuffer();
}

module.exports = { generateWelcomeImage };
