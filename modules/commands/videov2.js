const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
    name: "videov2",
    aliases: ["youtube"],
    version: "1.0.0",
    hasPrefix: true,
    permission: 'PUBLIC',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Search and download video from YouTube",
    category: "MEDIA",
    usages: "[video name]",
    cooldown: 5,
};

module.exports.run = async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    const input = args.join(" ");

    if (!input) {
        return api.sendMessage("❌ Please enter a video name.", threadID, messageID);
    }

    try {
        const searchResults = await ytSearch(input);
        if (!searchResults || !searchResults.videos.length) {
            return api.sendMessage("❌ No results found.", threadID, messageID);
        }

        const results = searchResults.videos.slice(0, 6);
        const thumbDir = path.join(__dirname, "temporary");
        if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

        let msg = "🎬 Top 6 results:\n\n";
        const attachments = [];
        const thumbnailPaths = [];

        for (let i = 0; i < results.length; i++) {
            const video = results[i];
            const thumbURL = video.thumbnail;
            const thumbPath = path.join(thumbDir, `thumb-${video.videoId}-${Date.now()}.jpg`);

            try {
                const thumbData = await axios.get(thumbURL, { responseType: "arraybuffer" });
                fs.writeFileSync(thumbPath, thumbData.data);
                attachments.push(fs.createReadStream(thumbPath));
                thumbnailPaths.push(thumbPath);
            } catch (e) {
                console.error("Error downloading thumbnail:", e);
            }

            msg += `${i + 1}. ${video.title} (${video.timestamp})\n`;
            msg += `👤 ${video.author.name} | 👁 ${video.views}\n\n`;
        }

        msg += "👉 Reply with the number to download.";

        api.sendMessage(
            {
                body: msg,
                attachment: attachments,
            },
            threadID,
            (err, info) => {
                if (err) return console.error("Send failed:", err);

                global.client.replies.set(threadID, [
                    ...(global.client.replies.get(threadID) || []),
                    {
                        command: this.config.name,
                        messageID: info.messageID,
                        expectedSender: senderID,
                        data: {
                            results,
                            messageIDToDelete: info.messageID,
                            thumbnailPaths
                        }
                    }
                ]);

                // Cleanup thumbnails after sending
                setTimeout(() => {
                    thumbnailPaths.forEach(p => {
                        if (fs.existsSync(p)) fs.unlink(p, () => { });
                    });
                }, 60 * 1000);
            },
            messageID
        );

    } catch (error) {
        console.error("Error in videov3 command:", error);
        api.sendMessage("❌ An error occurred.", threadID, messageID);
    }
};

module.exports.handleReply = async function ({ api, message, replyData }) {
    const { threadID, messageID, body } = message;
    const index = parseInt(body.trim());

    if (!replyData.results || isNaN(index) || index < 1 || index > replyData.results.length) {
        return api.sendMessage("❌ Please reply with a valid number.", threadID, messageID);
    }

    const video = replyData.results[index - 1];
    const videoUrl = video.url;
    const apiKey = global.config.apiKeys?.priyanshuApi;

    if (!apiKey) {
        return api.sendMessage("❌ API key not found in config.", threadID, messageID);
    }

    // Unsend the list message
    if (replyData.messageIDToDelete) {
        api.unsendMessage(replyData.messageIDToDelete);
    }

    const processingMsg = await api.sendMessage(`⏳ Processing: ${video.title}...`, threadID, messageID);

    try {
        // Quality chain: 360 -> 240 -> 144
        const qualitiesToTry = ["360", "240", "144"];
        let downloadData = null;
        let successfulQuality = "";

        for (const q of qualitiesToTry) {
            try {
                const apiUrl = "https://priyanshuapi.xyz/api/runner/youtube-downloader-v2/download";
                const response = await axios.post(
                    apiUrl,
                    {
                        link: videoUrl,
                        format: "mp4",
                        videoQuality: q,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.data && response.data.success && response.data.data) {
                    const data = response.data.data;

                    // Check file size
                    try {
                        const headResponse = await axios.head(data.downloadUrl);
                        const contentLength = headResponse.headers["content-length"];
                        if (contentLength && parseInt(contentLength) > 40 * 1024 * 1024) {
                            console.log(`Quality ${q} too large: ${contentLength} bytes`);
                            continue; // Try next quality
                        }
                    } catch (headError) {
                        console.error("Error checking file size:", headError);
                    }

                    downloadData = data;
                    successfulQuality = q;
                    break; // Found a valid quality
                }
            } catch (apiError) {
                console.error(`Failed to get link for quality ${q}:`, apiError.message);
            }
        }

        if (!downloadData) {
            api.unsendMessage(processingMsg.messageID);
            return api.sendMessage("❌ Failed to download video. File might be too large (>40MB) or unavailable.", threadID, messageID);
        }

        const { downloadUrl, title, filename } = downloadData;
        // Use video.title from search result as primary if API title is generic
        let finalTitle = title;
        if (!finalTitle || finalTitle === "YouTube Video" || finalTitle === "Unknown Title") {
            finalTitle = video.title;
        }

        // Format views
        const formattedViews = video.views ? new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(video.views) : "N/A";

        // Construct info message
        let infoMsg = `🎬 Title: ${finalTitle}\n`;
        if (video.timestamp) infoMsg += `⏱ Duration: ${video.timestamp}\n`;
        if (video.author && video.author.name) infoMsg += `👤 Channel: ${video.author.name}\n`;
        if (video.views) infoMsg += `👀 Views: ${formattedViews}\n`;
        infoMsg += `📺 Quality: ${successfulQuality}p\n`;
        infoMsg += `🔗 Source: ${videoUrl}\n`;
        infoMsg += `📥 Download Link: ${downloadUrl}\n`;

        api.unsendMessage(processingMsg.messageID);
        const downloadingMsg = await api.sendMessage(`⏳ Downloading ${finalTitle} (${successfulQuality}p)...`, threadID, messageID);

        // Download file
        const tempDir = path.join(__dirname, "temporary");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const safeFilename = (filename || `${Date.now()}.mp4`).replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = path.join(tempDir, safeFilename);

        const writer = fs.createWriteStream(filePath);
        const downloadResponse = await axios({
            method: "GET",
            url: downloadUrl,
            responseType: "stream",
        });

        downloadResponse.data.pipe(writer);

        writer.on("finish", async () => {
            // Verify file is not empty before sending
            fs.stat(filePath, async (statErr, stats) => {
                if (statErr || !stats || stats.size === 0) {
                    console.error("[videov2] Temp file is empty or unreadable, skipping send:", filePath, statErr);
                    api.unsendMessage(downloadingMsg.messageID);
                    api.sendMessage("❌ Download failed (empty video file). Please try again.", threadID, messageID);
                    return fs.unlink(filePath, () => { });
                }

                // Send the file with retry logic
                try {
                    await sendVideoWithRetry(api, threadID, infoMsg, filePath, downloadingMsg.messageID);
                } catch (sendError) {
                    console.error("Final send error:", sendError);
                    api.sendMessage("❌ Failed to send video after multiple attempts.", threadID, messageID);
                    // Ensure cleanup
                    if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
                }
            });
        });

        writer.on("error", (err) => {
            console.error("Error downloading file:", err);
            api.unsendMessage(downloadingMsg.messageID);
            api.sendMessage("❌ Failed to download the file.", threadID, messageID);
            fs.unlink(filePath, () => { });
        });

    } catch (error) {
        console.error("Error in videov3 command:", error);
        api.unsendMessage(processingMsg.messageID);
        api.sendMessage("❌ An error occurred.", threadID, messageID);
    }
};

async function sendVideoWithRetry(api, threadID, body, filePath, downloadingMsgID, attempt = 1) {
    const maxRetries = 3;

    try {
        console.log(`📤 Sending video (Attempt ${attempt}/${maxRetries})...`);

        await new Promise((resolve, reject) => {
            api.sendMessage(
                {
                    body: body,
                    attachment: fs.createReadStream(filePath),
                },
                threadID,
                (err, info) => {
                    if (err) reject(err);
                    else resolve(info);
                }
            );
        });

        console.log("✅ Video sent successfully.");
        if (downloadingMsgID) api.unsendMessage(downloadingMsgID);

        // Cleanup
        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
        }, 30000);

    } catch (err) {
        const errMsg = err && (err.error || err.message || JSON.stringify(err));
        console.error(`❌ Send failed (Attempt ${attempt}):`, errMsg);

        if (attempt < maxRetries) {
            console.log("🔄 Retrying in 2 seconds...");
            await new Promise(r => setTimeout(r, 2000));
            return sendVideoWithRetry(api, threadID, body, filePath, downloadingMsgID, attempt + 1);
        } else {
            // Fallback: Try sending separately
            console.log("⚠️ Combined send failed. Trying separate messages...");
            try {
                await api.sendMessage(body, threadID);
                await new Promise((resolve, reject) => {
                    api.sendMessage(
                        { attachment: fs.createReadStream(filePath) },
                        threadID,
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                console.log("✅ Video sent separately.");
                if (downloadingMsgID) api.unsendMessage(downloadingMsgID);

                setTimeout(() => {
                    if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
                }, 30000);

            } catch (fallbackErr) {
                throw fallbackErr; // Propagate error if fallback also fails
            }
        }
    }
}
