const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "imagine",
    aliases: ["imgine", "generate"],
    description: "Generate AI images using Pollinations model",
    usage: "{prefix}imagine3 <prompt>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "AI",
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID } = message;

    if (!args.length) {
      return api.sendMessage("❌ Please enter a prompt to generate an image.\n\nExample: /imagine3 a beautiful sunset over mountains", threadID, messageID);
    }

    const prompt = args.join(" ");
    const searchingMessage = await api.sendMessage(`🎨 Generating image for: "${prompt}"`, threadID);

    try {
      // Get API key from config
      const apiKey = global.config.apiKeys?.priyanshuApi || process.env.PRIYANSHU_API_KEY;
      if (!apiKey) {
        return api.sendMessage("❌ API key not configured.", threadID, messageID);
      }

      // Call the Pollinations image generation API
      const { data } = await axios.post("https://priyanshu-apis-frontend.onrender.com/api/runner/pollinations-image-gen/generate", {
        prompt: prompt,
        width: 1200
      }, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!data.success || !data.data?.imageUrl) {
        return api.sendMessage("❌ Failed to generate image.", threadID, messageID);
      }

      // Download and send image
      const imageUrl = data.data.imageUrl;
      const folderPath = path.join(__dirname, "temp");
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

      const fileName = `imagine3_${Date.now()}.png`;
      const filePath = path.join(folderPath, fileName);

      const response = await axios({
        method: "GET",
        url: imageUrl,
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage({
          attachment: fs.createReadStream(filePath)
        }, threadID, messageID);
        
        api.unsendMessage(searchingMessage.messageID);
        setTimeout(() => fs.unlink(filePath, () => {}), 30000);
      });

    } catch (error) {
      api.sendMessage("❌ An error occurred while generating the image.", threadID, messageID);
    }
  }
};
