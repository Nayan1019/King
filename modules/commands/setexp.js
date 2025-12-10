/**
 * SetExp Command
 * Allows admins to set experience points for users
 */

module.exports = {
  config: {
    name: 'setexp',
    aliases: ['setexperience', 'setlevel'],
    description: 'Set experience points for a user',
    usage: '{prefix}setexp [@mention/uid] [amount] or {prefix}setexp [amount] (for self)',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ADMIN',
    hasPrefix: true,
    permission: 'ADMIN',  // Only admins can use this command
    cooldown: 5
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID, mentions } = message;
    
    try {
      // Check if user has permission
      const hasPermission = await global.permissions.checkPermission(senderID, 'ADMIN');
      if (!hasPermission) {
        return api.sendMessage('❌ You do not have permission to use this command.', threadID, messageID);
      }
      
      let targetID, targetName, amount;
      
      // Case 1: Setting exp for self
      if (args.length === 1 && !isNaN(args[0])) {
        targetID = senderID;
        targetName = 'yourself';
        amount = parseInt(args[0]);
      }
      // Case 2: Setting exp for mentioned user
      else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        targetName = mentions[targetID].replace('@', '');
        amount = parseInt(args[args.length - 1]);
      }
      // Case 3: Setting exp using UID
      else if (args.length >= 2 && !isNaN(args[0]) && args[0].length >= 10) {
        targetID = args[0];
        targetName = 'user with ID ' + targetID;
        amount = parseInt(args[1]);
      }
      // Invalid usage
      else {
        return api.sendMessage(
          '❌ Invalid usage. Please use one of these formats:\n' +
          '1. {prefix}setexp [amount] (to set your own exp)\n' +
          '2. {prefix}setexp [@mention] [amount] (to set exp for mentioned user)\n' +
          '3. {prefix}setexp [uid] [amount] (to set exp using user ID)',
          threadID, messageID
        );
      }
      
      // Validate amount
      if (isNaN(amount) || amount < 0) {
        return api.sendMessage('❌ Please provide a valid positive number for experience points.', threadID, messageID);
      }
      
      // Get currency data
      let currency = await global.Currency.findOne({ userID: targetID });
      
      // Create if not exists
      if (!currency) {
        currency = await global.Currency.create({ userID: targetID });
      }
      
      // Set experience points
      currency.exp = amount;
      
      // Calculate new level based on XP
      // Calculate level based on updated XP thresholds
      // Level 1: 0-39 XP
      // Level 2: 40-99 XP
      // Level 3: 100-179 XP
      // Level 4+: Increases by level * 20 XP
      
      let newLevel = 1;
      
      if (amount >= 180) { // Level 4+ threshold
        // For higher levels, calculate based on the formula
        let remainingXP = amount;
        let levelXP = 0;
        
        // Subtract XP needed for first 3 levels
        remainingXP -= 40; // Level 1 to 2
        remainingXP -= 60; // Level 2 to 3
        remainingXP -= 80; // Level 3 to 4
        
        newLevel = 4; // Start at level 4
        
        // Calculate additional levels
        while (remainingXP >= 0) {
          levelXP = newLevel * 20; // XP needed for next level
          if (remainingXP < levelXP) break;
          
          remainingXP -= levelXP;
          newLevel++;
        }
      } else if (amount >= 100) { // Level 3 threshold
        newLevel = 3;
      } else if (amount >= 40) { // Level 2 threshold
        newLevel = 2;
      }
      
      // Set new level
      currency.level = newLevel;
      
      // Update bank capacity based on level
      let newBankCapacity = 5000; // Base capacity
      
      if (newLevel === 2) {
        newBankCapacity = 7000;
      } else if (newLevel === 3) {
        newBankCapacity = 10000;
      } else if (newLevel === 4) {
        newBankCapacity = 15000;
      } else if (newLevel > 4) {
        newBankCapacity = 15000 + ((newLevel - 4) * 5000);
      }
      
      currency.bankCapacity = newBankCapacity;
      
      // Save changes
      await currency.save();
      
      // Send confirmation message
      return api.sendMessage(
        `✅ Set ${amount} experience points for ${targetName}.\n` +
        `👤 New Level: ${newLevel}\n` +
        `🏦 New Bank Capacity: ${newBankCapacity}`,
        threadID, messageID
      );
    } catch (error) {
      global.logger.error('Error in setexp command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};