/**
 * Image Help Command
 * Shows help for all image generation commands
 */

module.exports = {
  config: {
    name: 'imagehelp',
    aliases: ['imghelp', 'imagecommands'],
    description: 'Shows help for all image generation commands',
    usage: '{prefix}imagehelp',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 5,
    category: 'HELP'
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
    const prefix = global.config.prefix;
    
    try {
      // Create help message for all image commands
      const helpMessage = `🖼️ 𝐈𝐦𝐚𝐠𝐞 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐨𝐧 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬\n\n` +
        `1️⃣ ${prefix}imagegen - Basic image effects\n` +
        `   Effects: rip, triggered, spank, jail, trash, blur\n` +
        `   Usage: ${prefix}imagegen [effect] [@mention]\n\n` +
        
        `2️⃣ ${prefix}imageeffects - More image effects\n` +
        `   Effects: kiss, slap, wanted, beautiful, affect, delete\n` +
        `   Usage: ${prefix}imageeffects [effect] [@mention]\n\n` +
        
        `3️⃣ ${prefix}imagefilters - Apply filters to images\n` +
        `   Filters: greyscale, invert, sepia, brightness, darkness, circle\n` +
        `   Usage: ${prefix}imagefilters [filter] [@mention]\n\n` +
        
        `4️⃣ ${prefix}imagemanipulation - Advanced effects\n` +
        `   Effects: pixelate, rainbow, ad, bobross, confusedstonk, stonk, notstonk\n` +
        `   Usage: ${prefix}imagemanipulation [effect] [@mention] [text]\n\n` +
        
        `5️⃣ ${prefix}imagecombine - Combine two profile pictures\n` +
        `   Effects: ship, vs, fusion, kiss, slap, spank\n` +
        `   Usage: ${prefix}imagecombine [effect] [@mention1] [@mention2]\n\n` +
        
        `6️⃣ ${prefix}memes - Generate popular memes\n` +
        `   Types: changemymind, drake, podium, poutine, bed, facepalm\n` +
        `   Usage: ${prefix}memes [type] [text]\n\n` +
        
        `💡 For more details on each command, type the command without any arguments.\n` +
        `Example: ${prefix}imagegen`;
      
      // Send the help message
      return api.sendMessage(helpMessage, threadID, messageID);
      
    } catch (error) {
      global.logger.error(`Error in imagehelp command: ${error.message}`);
      return api.sendMessage(
        `❌ An error occurred: ${error.message}`,
        threadID,
        messageID
      );
    }
  }
};