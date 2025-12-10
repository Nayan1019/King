/**
 * Image Search Command
 * Search and send images from Google
 */

const googlethis = require('googlethis');
const cloudscraper = require('cloudscraper');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "imagesearch",
    // aliases: ["img", "image", "pic"],
    description: "Search and send images from Google",
    usages: "{prefix}imagesearch <search query>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "MEDIA",
    hasPrefix: true,
    permission: "PUBLIC",
    cooldowns: 5
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID } = message;
    
    // Check if search query is provided
    if (!args || args.length === 0) {
      return api.sendMessage("❌ Please provide a search query!\n\nUsage: imagesearch <search term>\nExample: imagesearch cute cats", threadID, messageID);
    }
    
    const searchQuery = args.join(" ");
    
    try {
      // Send loading message
      api.sendMessage(`🔍 Searching for "${searchQuery}" images...`, threadID);
      
      // Search for images using Google Custom Search API
      const imageUrls = await searchGoogleImages(searchQuery);
      
      if (!imageUrls || imageUrls.length === 0) {
        return api.sendMessage("❌ No images found for your search query. Try a different search term.", threadID, messageID);
      }
      
      // Send downloading message
      api.sendMessage(`🔄 Found ${Math.min(6, imageUrls.length)} images! Downloading...`, threadID);
      
      // Download and send images
      const attachments = [];
      const maxImages = Math.min(6, imageUrls.length);
      
      for (let i = 0; i < maxImages; i++) {
        try {
          const imageStream = await downloadImage(imageUrls[i], i);
          if (imageStream) {
            attachments.push(imageStream);
          }
        } catch (error) {
          console.log(`Failed to download image ${i + 1}:`, error.message);
        }
      }
      
      if (attachments.length === 0) {
        return api.sendMessage("❌ Failed to download images. Please try again later.", threadID, messageID);
      }
      
      // Send images
      return api.sendMessage({
        body: `🖼️ Here are ${attachments.length} images for "${searchQuery}":`,
        attachment: attachments
      }, threadID, messageID);
      
    } catch (error) {
      console.error("Image search error:", error);
      return api.sendMessage("❌ An error occurred while searching for images. Please try again later.", threadID, messageID);
    }
  }
};

/**
 * Search for images using googlethis and cloudscraper
 * @param {string} query - Search query
 * @returns {Promise<Array<string>>} Array of image URLs
 */
async function searchGoogleImages(query) {
  try {
    // Use googlethis to search images
    const results = await googlethis.image(query, { safe: false });
    
    if (results && results.length > 0) {
      return results.slice(0, 6).map(img => img.url);
    }
    
    return [];
  } catch (error) {
    console.error('Google Image search failed:', error);
    return [];
  }
}


/**
 * Download image from URL using cloudscraper
 * @param {string} url - Image URL
 * @param {number} index - Image index for filename
 * @returns {Promise<fs.ReadStream>} Image stream
 */
async function downloadImage(url, index) {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate filename
    const filename = `image_${Date.now()}_${index}.jpg`;
    const filepath = path.join(tempDir, filename);
    
    // Use cloudscraper to download image
    const imageBuffer = await cloudscraper.get({
      uri: url,
      encoding: null, // This returns a buffer instead of string
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Write buffer to file
    fs.writeFileSync(filepath, imageBuffer);
    
    // Clean up file after use
    setTimeout(() => {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (e) {
        console.log("Failed to cleanup temp file:", filepath);
      }
    }, 30000); // Delete after 30 seconds
    
    return fs.createReadStream(filepath);
    
  } catch (error) {
    console.error("Error downloading image:", error.message);
    return null;
  }
}
