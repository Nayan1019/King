/**
 * Item Status Command
 * Shows the status of all active items in a user's inventory
 */

module.exports = {
  config: {
    name: 'itemstatus',
    aliases: ['activeitems', 'buffs', 'boosts'],
    description: 'Check the status of all active items in your inventory',
    usage: '{prefix}itemstatus [mention]',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'ECONOMY',
    hasPrefix: true,
    permission: 'PUBLIC',
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
      // Determine target user
      let targetID = senderID;
      let mentionName = '';
      
      // Check if a user is mentioned
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        mentionName = mentions[targetID].replace('@', '');
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: targetID });
      if (!user) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your user data was not found.' 
            : '❌ User data for the mentioned person was not found.',
          threadID,
          messageID
        );
      }
      
      // Get currency data
      const currency = await global.Currency.findOne({ userID: targetID });
      if (!currency) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your currency data was not found.' 
            : '❌ Currency data for the mentioned person was not found.',
          threadID,
          messageID
        );
      }
      
      // Check if inventory exists
      if (!currency.inventory || !Array.isArray(currency.inventory) || currency.inventory.length === 0) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ Your inventory is empty.' 
            : `❌ ${mentionName || 'This user'}'s inventory is empty.`,
          threadID,
          messageID
        );
      }
      
      // Filter active (non-expired) items
      const now = new Date();
      const activeItems = currency.inventory.filter(item => !item.expiry || new Date(item.expiry) > now);
      
      if (activeItems.length === 0) {
        return api.sendMessage(
          targetID === senderID 
            ? '❌ You have no active items in your inventory.' 
            : `❌ ${mentionName || 'This user'} has no active items in their inventory.`,
          threadID,
          messageID
        );
      }
      
      // Group items by type
      const itemGroups = {};
      
      for (const item of activeItems) {
        if (!itemGroups[item.id]) {
          itemGroups[item.id] = [];
        }
        itemGroups[item.id].push(item);
      }
      
      // Define item display names and effects
      const itemInfo = {
        vip: {
          name: '🌟 VIP Status',
          effect: 'Reduced cooldowns, higher earnings from work',
          stackEffect: false
        },
        luckycharm: {
          name: '🍀 Lucky Charm',
          effect: '+10% gambling win chance',
          stackEffect: true,
          maxStack: 3,
          stackMultiplier: 10
        },
        bankupgrade: {
          name: '🏦 Bank Upgrade',
          effect: '+10,000 bank capacity per upgrade',
          stackEffect: true,
          stackMultiplier: 10000
        },
        expbooster: {
          name: '⚡ EXP Booster',
          effect: '+50% EXP gain',
          stackEffect: true,
          maxStack: 3,
          stackMultiplier: 50
        },
        moneybooster: {
          name: '💸 Money Booster',
          effect: '+50% money gain',
          stackEffect: true,
          maxStack: 3,
          stackMultiplier: 50
        }
      };
      
      // Prepare response message
      let userName = user.name || (targetID === senderID ? 'You' : mentionName || 'This user');
      let response = `📊 𝗔𝗖𝗧𝗜𝗩𝗘 𝗜𝗧𝗘𝗠𝗦 𝗦𝗧𝗔𝗧𝗨𝗦\n\n`;
      
      if (targetID !== senderID) {
        response += `👤 User: ${userName}\n\n`;
      }
      
      // Add active items and their effects
      for (const [itemId, items] of Object.entries(itemGroups)) {
        const info = itemInfo[itemId] || { name: itemId, effect: 'Unknown effect', stackEffect: false };
        
        response += `${info.name} (${items.length}):\n`;
        
        // Add effect information
        if (info.stackEffect && items.length > 1) {
          const totalEffect = Math.min(items.length, info.maxStack || items.length) * info.stackMultiplier;
          response += `- Effect: ${info.effect} (Total: +${totalEffect}%)\n`;
        } else {
          response += `- Effect: ${info.effect}\n`;
        }
        
        // Add expiry information for each item
        if (items.some(item => item.expiry)) {
          response += `- Expiry:\n`;
          
          // Sort items by expiry date (earliest first)
          const sortedItems = [...items].filter(item => item.expiry).sort((a, b) => {
            return new Date(a.expiry) - new Date(b.expiry);
          });
          
          // Show expiry for up to 3 items
          const itemsToShow = sortedItems.slice(0, 3);
          
          for (let i = 0; i < itemsToShow.length; i++) {
            const item = itemsToShow[i];
            const expiryDate = new Date(item.expiry);
            const timeLeft = expiryDate - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            
            if (hoursLeft > 24) {
              const daysLeft = Math.floor(hoursLeft / 24);
              response += `  • ${i + 1}: ${daysLeft} day(s) remaining\n`;
            } else {
              response += `  • ${i + 1}: ${hoursLeft} hour(s) remaining\n`;
            }
          }
          
          // If there are more items, show a summary
          if (sortedItems.length > 3) {
            response += `  • +${sortedItems.length - 3} more...\n`;
          }
        } else if (itemId === 'bankupgrade') {
          response += `- Permanent upgrade\n`;
        }
        
        response += `\n`;
      }
      
      // Calculate total boosts
      const expBoosterCount = (itemGroups.expbooster || []).length;
      const moneyBoosterCount = (itemGroups.moneybooster || []).length;
      const luckyCharmCount = (itemGroups.luckycharm || []).length;
      
      if (expBoosterCount > 0 || moneyBoosterCount > 0 || luckyCharmCount > 0) {
        response += `📈 𝗧𝗢𝗧𝗔𝗟 𝗕𝗢𝗢𝗦𝗧𝗦:\n`;
        
        if (expBoosterCount > 0) {
          const expBoost = Math.min(expBoosterCount, 3) * 50;
          response += `- EXP Gain: +${expBoost}%\n`;
        }
        
        if (moneyBoosterCount > 0) {
          const moneyBoost = Math.min(moneyBoosterCount, 3) * 50;
          response += `- Money Gain: +${moneyBoost}%\n`;
        }
        
        if (luckyCharmCount > 0) {
          const luckBoost = Math.min(luckyCharmCount, 3) * 10;
          response += `- Gambling Luck: +${luckBoost}%\n`;
        }
      }
      
      // Add bank capacity info if bank upgrades exist
      const bankUpgradeCount = (itemGroups.bankupgrade || []).length;
      if (bankUpgradeCount > 0) {
        const baseCapacity = 5000;
        const levelCapacity = (currency.level - 1) * 5000;
        const upgradeCapacity = bankUpgradeCount * 10000;
        const totalCapacity = baseCapacity + levelCapacity + upgradeCapacity;
        
        response += `\n🏦 𝗕𝗔𝗡𝗞 𝗖𝗔𝗣𝗔𝗖𝗜𝗧𝗬:\n`;
        response += `- Base: ${baseCapacity.toLocaleString()} coins\n`;
        response += `- From Level (${currency.level}): +${levelCapacity.toLocaleString()} coins\n`;
        response += `- From Upgrades (${bankUpgradeCount}): +${upgradeCapacity.toLocaleString()} coins\n`;
        response += `- Total: ${totalCapacity.toLocaleString()} coins\n`;
      }
      
      // Send response
      return api.sendMessage(response, threadID, messageID);
      
    } catch (error) {
      global.logger.error('Error in itemstatus command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};