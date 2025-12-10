const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "upscale",
    aliases: ["enhance", "hd", "4k"],
    description: "Upscale image quality (2x or 4x)",
    usage: "{prefix}upscale [2|4] (reply to an image)\n\nExamples:\n{prefix}upscale - 2x upscale (free)\n{prefix}upscale 2 - 2x upscale\n{prefix}upscale 4 - 4x upscale (paid only)",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 15,
    category: 'MEDIA'
  },

  run: async function({ api, message, args }) {
    const { threadID, messageID, messageReply } = message;

    // Check if user replied to a message
    if (!messageReply) {
      return api.sendMessage(
        "❌ Please reply to an image to upscale it!\n\n📖 Usage:\n• /upscale - 2x upscale (free)\n• /upscale 2 - 2x upscale\n• /upscale 4 - 4x upscale (paid only)\n\nReply to an image and use the command!",
        threadID,
        messageID
      );
    }

    // Check if the replied message has attachments
    if (!messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage(
        "❌ The message you replied to doesn't contain any image!\n\nPlease reply to a message with an image.",
        threadID,
        messageID
      );
    }

    // Check if the attachment is an image
    const attachment = messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return api.sendMessage(
        "❌ The attachment must be an image (photo)!\n\nSupported: Photos only",
        threadID,
        messageID
      );
    }

    // Parse scale parameter (default: 2)
    let scale = 2;
    if (args.length > 0) {
      const scaleArg = parseInt(args[0]);
      if (scaleArg === 2 || scaleArg === 4) {
        scale = scaleArg;
      } else {
        return api.sendMessage(
          "❌ Invalid scale value!\n\n✅ Valid options:\n• 2 - 2x upscale (free)\n• 4 - 4x upscale (paid only)\n\nExample: /upscale 2",
          threadID,
          messageID
        );
      }
    }

    const imageUrl = attachment.url;

    // Send processing message
    const processingText = scale === 4 
      ? "⏳ Processing your image... Upscaling to 4K quality...\n\n⚠️ 4x upscale is for paid users only!\n\nThis may take 10-30 seconds ⏰"
      : "⏳ Processing your image... Upscaling to HD quality...\n\nThis may take 5-15 seconds ⏰";

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

          // Download the image
          const inputPath = path.join(tempDir, `input_upscale_${Date.now()}.jpg`);
          const outputPath = path.join(tempDir, `output_upscale_${Date.now()}.jpg`);

          // Download image from URL
          const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          await fs.writeFile(inputPath, imageResponse.data);

          // Get API key from config
          const apiKey = global.config?.apiKeys?.priyanshuApi || 'apim_PHNPYM8mq_Mpav9ue8sGJ6MNPAEvKNKJ13Uq1YZGcX4';

          // Create form data
          const formData = new FormData();
          formData.append('image', fs.createReadStream(inputPath));
          formData.append('scale', scale.toString());

          // Call Upscale API
          const response = await axios.post(
            'https://priyanshuapi.xyz/api/runner/upscale/upscale',
            formData,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders()
              },
              timeout: 90000 // 90 second timeout for 4x upscale
            }
          );

          // Check if successful
          if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'API returned unsuccessful response');
          }

          const resultImageUrl = response.data.imageUrl;
          const usedScale = response.data.data?.scale || scale;

          // Download the result image
          const resultResponse = await axios.get(resultImageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          await fs.writeFile(outputPath, resultResponse.data);

          // Send the result image
          const successMessage = usedScale === 4
            ? `✅ Image upscaled to 4K quality!\n\n🎨 ${usedScale}x Enhanced | Ultra HD`
            : `✅ Image upscaled to HD quality!\n\n🎨 ${usedScale}x Enhanced | High Definition`;

          api.sendMessage(
            {
              body: successMessage,
              attachment: fs.createReadStream(outputPath)
            },
            threadID,
            async (sendErr) => {
              if (sendErr) {
                console.error("Send result error:", sendErr);
                return api.sendMessage(
                  "❌ Failed to send the upscaled image. Please try again.",
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
              try {
                await fs.unlink(inputPath);
                await fs.unlink(outputPath);
              } catch (cleanupErr) {
                console.error("Cleanup error:", cleanupErr);
              }
            }
          );

        } catch (error) {
          console.error("Upscale error:", error);
          
          let errorMessage = "❌ Failed to upscale the image.\n\n";
          
          if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMessage += "⏰ Request timed out. The image might be too large or the API is slow.";
          } else if (error.response) {
            errorMessage += `🔴 API Error: ${error.response.status}\n`;
            const apiMessage = error.response.data?.message || 'Unknown error';
            errorMessage += `Message: ${apiMessage}\n\n`;
            
            // Special message for 4x paid users only error
            if (apiMessage.includes('paid users') || apiMessage.includes('4x')) {
              errorMessage += "💡 Tip: Try using 2x upscale instead (free)\nCommand: /upscale 2";
            }
          } else if (error.request) {
            errorMessage += "🌐 Network error. Please check your internet connection.";
          } else {
            errorMessage += `💥 Error: ${error.message}`;
          }
          
          errorMessage += "\n\nPlease try again later.";
          
          // Unsend processing message on error too
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
