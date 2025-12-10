const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "getlink",
        aliases: ["uploadfile", "filelink", "upload"],
        description: "Upload files and get shareable links (supports multiple files)",
        usage: "{prefix}getlink (reply to file(s))\n\nSupports:\n• Images (JPG, PNG, GIF)\n• Videos (MP4, MOV, AVI)\n• Audio (MP3, WAV)\n• Documents (PDF, DOC, TXT)\n• Any file type!\n\nMultiple attachments supported!",
        credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
        hasPrefix: true,
        permission: 'PUBLIC',
        cooldown: 10,
        category: 'UTILITY'
    },

    run: async function ({ api, message, args }) {
        const { threadID, messageID, messageReply } = message;

        // Check if user replied to a message
        if (!messageReply) {
            return api.sendMessage(
                "❌ Please reply to a message with file(s) to upload!\n\n📖 Usage:\nReply to any message containing files and type /getlink\n\n✅ Supported:\n• Images (photos)\n• Videos\n• Audio\n• Documents\n• Any file type!\n\n💡 Can upload multiple files at once!",
                threadID,
                messageID
            );
        }

        // Check if the replied message has attachments
        if (!messageReply.attachments || messageReply.attachments.length === 0) {
            return api.sendMessage(
                "❌ The message you replied to doesn't contain any files!\n\nPlease reply to a message with file attachments.",
                threadID,
                messageID
            );
        }

        const attachments = messageReply.attachments;
        const fileCount = attachments.length;

        // Send processing message
        const processingText = fileCount === 1
            ? "⏳ Uploading your file...\n\nPlease wait ⏰"
            : `⏳ Uploading ${fileCount} files...\n\nThis may take a moment ⏰`;

        api.sendMessage(
            processingText,
            threadID,
            async (err, info) => {
                if (err) return console.error("Send processing message error:", err);

                const processingMessageID = info.messageID; // Store for later unsend

                try {
                    // Create temp directory if it doesn't exist
                    const tempDir = path.join(process.cwd(), 'temporary');
                    await fs.ensureDir(tempDir);

                    const downloadedFiles = [];
                    const timestamp = Date.now();

                    // Download all attachments
                    for (let i = 0; i < attachments.length; i++) {
                        const attachment = attachments[i];
                        const fileUrl = attachment.url;

                        // Determine file extension from URL or type
                        let extension = 'file';
                        if (attachment.type === 'photo') {
                            extension = 'jpg';
                        } else if (attachment.type === 'video') {
                            extension = 'mp4';
                        } else if (attachment.type === 'audio') {
                            extension = 'mp3';
                        } else if (fileUrl) {
                            // Try to extract extension from URL
                            const urlParts = fileUrl.split('?')[0].split('.');
                            if (urlParts.length > 1) {
                                extension = urlParts[urlParts.length - 1];
                            }
                        }

                        const filename = `file_${timestamp}_${i}.${extension}`;
                        const filePath = path.join(tempDir, filename);

                        try {
                            // Download file
                            const response = await axios.get(fileUrl, {
                                responseType: 'arraybuffer',
                                timeout: 60000 // 60 second timeout per file
                            });

                            await fs.writeFile(filePath, response.data);
                            downloadedFiles.push({
                                path: filePath,
                                filename: filename,
                                type: attachment.type
                            });
                        } catch (downloadErr) {
                            console.error(`Error downloading file ${i}:`, downloadErr);
                            // Continue with other files
                        }
                    }

                    if (downloadedFiles.length === 0) {
                        throw new Error('Failed to download any files');
                    }

                    // Get API key from config
                    const apiKey = global.config?.apiKeys?.priyanshuApi || 'apim_PHNPYM8mq_Mpav9ue8sGJ6MNPAEvKNKJ13Uq1YZGcX4';

                    // Create form data and append all files
                    const formData = new FormData();
                    downloadedFiles.forEach(file => {
                        formData.append('files', fs.createReadStream(file.path));
                    });

                    // Upload to API
                    const uploadResponse = await axios.post(
                        'https://priyanshuapi.xyz/api/runner/file-upload/upload',
                        formData,
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                ...formData.getHeaders()
                            },
                            timeout: 120000, // 2 minute timeout for upload
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity
                        }
                    );

                    // Check if upload was successful
                    if (!uploadResponse.data || !uploadResponse.data.success) {
                        throw new Error(uploadResponse.data?.message || 'Upload failed');
                    }

                    const result = uploadResponse.data;
                    const uploadedCount = result.uploaded || 0;
                    const failedCount = result.failed || 0;

                    // Build response message
                    let responseMessage = `✅ Upload Complete!\n\n`;
                    responseMessage += `📊 Status:\n`;
                    responseMessage += `• Uploaded: ${uploadedCount}/${fileCount}\n`;
                    if (failedCount > 0) {
                        responseMessage += `• Failed: ${failedCount}\n`;
                    }
                    responseMessage += `\n🔗 Links:\n\n`;

                    // Add links for each uploaded file
                    if (result.files && result.files.length > 0) {
                        result.files.forEach((file, index) => {
                            if (file.success) {
                                const fileNumber = index + 1;
                                const fileName = file.filename || `File ${fileNumber}`;
                                const fileSize = file.size ? `(${formatFileSize(file.size)})` : '';
                                const fileType = file.mimetype || '';

                                responseMessage += `${fileNumber}. ${fileName} ${fileSize}\n`;
                                responseMessage += `   ${file.url}\n\n`;
                            } else {
                                responseMessage += `${index + 1}. ❌ Failed: ${file.filename || 'Unknown'}\n`;
                                if (file.error) {
                                    responseMessage += `   Error: ${file.error}\n\n`;
                                }
                            }
                        });
                    }

                    responseMessage += `\n💡 Links are hosted on Catbox.moe\n`;
                    responseMessage += `⏰ Links expire: Never (permanent)`;

                    // Send result message
                    api.sendMessage(
                        responseMessage,
                        threadID,
                        async (sendErr) => {
                            if (sendErr) {
                                console.error("Send result error:", sendErr);
                                return api.sendMessage(
                                    "❌ Upload successful but failed to send links. Check console logs.",
                                    threadID,
                                    messageID
                                );
                            }

                            // Unsend processing message
                            try {
                                api.unsendMessage(processingMessageID);
                            } catch (unsendErr) {
                                console.error("Unsend error:", unsendErr);
                            }

                            // Clean up temporary files
                            for (const file of downloadedFiles) {
                                try {
                                    await fs.unlink(file.path);
                                } catch (cleanupErr) {
                                    console.error("Cleanup error:", cleanupErr);
                                }
                            }
                        }
                    );

                } catch (error) {
                    console.error("GetLink error:", error);

                    let errorMessage = "❌ Failed to upload file(s).\n\n";

                    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                        errorMessage += "⏰ Request timed out. Files might be too large or connection is slow.";
                    } else if (error.response) {
                        errorMessage += `🔴 API Error: ${error.response.status}\n`;
                        errorMessage += `Message: ${error.response.data?.message || 'Unknown error'}`;
                    } else if (error.request) {
                        errorMessage += "🌐 Network error. Please check your internet connection.";
                    } else {
                        errorMessage += `💥 Error: ${error.message}`;
                    }

                    errorMessage += "\n\n💡 Tips:\n";
                    errorMessage += "• Try smaller files\n";
                    errorMessage += "• Upload fewer files at once\n";
                    errorMessage += "• Check your internet connection";

                    // Unsend processing message on error
                    try {
                        api.unsendMessage(processingMessageID);
                    } catch (unsendErr) {
                        console.error("Unsend error:", unsendErr);
                    }

                    return api.sendMessage(errorMessage, threadID, messageID);
                }
            }
        );
    }
};

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
