const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "imagine2",
    aliases: ["img2", "generate2"],
    description: "Generate AI images using TAAFT model",
    usage: "{prefix}imagine2 <prompt>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "AI",
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5
  },

  run: async function ({ api, message, args }) {
    const { threadID, messageID } = message;

    if (!args.length) {
      return api.sendMessage("❌ Please enter a prompt to generate an image.\n\nExample: /imagine2 a beautiful sunset over mountains", threadID, messageID);
    }

    const prompt = args.join(" ");
    const searchingMessage = await api.sendMessage(`🎨 Generating image for: "${prompt}"`, threadID);

    try {
      // Get API key from config
      const apiKey = global.config.apiKeys?.priyanshuApi || process.env.PRIYANSHU_API_KEY;
      if (!apiKey) {
        return api.sendMessage("❌ API key not configured.", threadID, messageID);
      }

      console.log("🚀 Starting image generation...");
      console.log("API Key:", apiKey.substring(0, 20) + "...");
      console.log("Prompt:", prompt.substring(0, 50) + "...");

      // Call the TAAFT image generation API - handle 504 gracefully
      console.log("🚀 Calling API...");
      
      const response = await fetch("https://priyanshuapi.xyz/api/runner/taaft-image-gen/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          aspectRatio: "16:9"
        })
      });

      console.log("Response status:", response.status);

      // If 504, the API is still processing but Netlify timed out
      // Let's wait and try one more time
      if (response.status === 504) {
        console.log("⚠️ Got 504 from Netlify, but API might still be processing...");
        console.log("⏳ Waiting 30 seconds for API to complete...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log("🔄 Trying one more time...");
        const retryResponse = await fetch("https://priyanshuapi.xyz/api/runner/taaft-image-gen/generate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: prompt,
            aspectRatio: "16:9"
          })
        });
        
        console.log("Retry response status:", retryResponse.status);
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          console.log("✅ API Response received on retry:", data);
          
          if (data.success && data.data?.imageUrl) {
            // Success! Continue to download image
            const imageUrl = data.data.imageUrl;
            const folderPath = path.join(__dirname, "temp");
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

            const fileName = `imagine2_${Date.now()}.png`;
            const filePath = path.join(folderPath, fileName);

            console.log("📥 Downloading image from:", imageUrl);

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.status}`);
            }

            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            fs.writeFileSync(filePath, buffer);
            console.log("✅ Image saved to:", filePath);

            api.sendMessage({
              attachment: fs.createReadStream(filePath)
            }, threadID, messageID);
            
            api.unsendMessage(searchingMessage.messageID);
            setTimeout(() => fs.unlink(filePath, () => {}), 30000);
            return; // Exit successfully
          }
        }
        
        // If retry also failed
        return api.sendMessage("❌ API is taking too long. Please try with a shorter prompt.", threadID, messageID);
      }

      if (!response.ok) {
        console.log("❌ Response not OK:", response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ API Response received:", data);

      if (!data.success || !data.data?.imageUrl) {
        return api.sendMessage("❌ Failed to generate image.", threadID, messageID);
      }

      // Download and send image
      const imageUrl = data.data.imageUrl;
      const folderPath = path.join(__dirname, "temp");
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

      const fileName = `imagine2_${Date.now()}.png`;
      const filePath = path.join(folderPath, fileName);

      console.log("📥 Downloading image from:", imageUrl);

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      fs.writeFileSync(filePath, buffer);
      console.log("✅ Image saved to:", filePath);

      api.sendMessage({
        attachment: fs.createReadStream(filePath)
      }, threadID, messageID);
      
      api.unsendMessage(searchingMessage.messageID);
      setTimeout(() => fs.unlink(filePath, () => {}), 30000);

    } catch (error) {
      console.error("❌ Error in imagine2:", error);
      api.sendMessage("❌ An error occurred while generating the image.", threadID, messageID);
      api.unsendMessage(searchingMessage.messageID);
    }
  }
};
