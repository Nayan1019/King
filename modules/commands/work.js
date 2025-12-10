/**
 * Work Command
 * Allows users to work and earn money
 */

module.exports = {
  config: {
    name: 'work',
    aliases: ['job'],
    description: 'Work to earn money',
    usage: '{prefix}work',
    credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
    category: 'economy',
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 3600 // 1 hour cooldown
  },
  
  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    
    try {
      // Get user's currency data
      let userCurrency = await global.Currency.findOne({ userID: senderID });
      if (!userCurrency) {
        return api.sendMessage('❌ Your currency data not found.', threadID, messageID);
      }
      
      // Get user data
      const user = await global.User.findOne({ userID: senderID });
      if (!user) {
        return api.sendMessage('❌ User data not found.', threadID, messageID);
      }
      
      // Define jobs and their earnings
      const jobs = [
        { name: 'Software Developer', earnings: { min: 500, max: 1000 } },
        { name: 'Teacher', earnings: { min: 300, max: 700 } },
        { name: 'Doctor', earnings: { min: 800, max: 1500 } },
        { name: 'Delivery Driver', earnings: { min: 200, max: 500 } },
        { name: 'Chef', earnings: { min: 400, max: 800 } },
        { name: 'Freelancer', earnings: { min: 100, max: 1200 } },
        { name: 'Mechanic', earnings: { min: 300, max: 600 } },
        { name: 'Farmer', earnings: { min: 200, max: 700 } },
        { name: 'Streamer', earnings: { min: 100, max: 2000 } },
        { name: 'Artist', earnings: { min: 200, max: 1000 } }
      ];
      
      // Define work scenarios for each job
      const scenarios = {
        'Software Developer': [
          'You fixed a critical bug in the production code.',
          'You developed a new feature that impressed the client.',
          'You optimized the database queries, improving performance by 30%.',
          'You helped a junior developer understand complex code.',
          'You successfully completed a challenging project ahead of schedule.'
        ],
        'Teacher': [
          'You prepared an engaging lesson that students loved.',
          'You helped a struggling student improve their grades.',
          'You organized a successful field trip.',
          'You graded all the exam papers over the weekend.',
          'You received positive feedback from parents.'
        ],
        'Doctor': [
          'You diagnosed a rare condition that other doctors missed.',
          'You performed a successful emergency surgery.',
          'You worked a double shift to cover for a sick colleague.',
          'You comforted a scared patient before their procedure.',
          'You volunteered at a free clinic on your day off.'
        ],
        'Delivery Driver': [
          'You completed all your deliveries ahead of schedule.',
          'You navigated through heavy traffic to deliver on time.',
          'You delivered in bad weather conditions.',
          'You received a generous tip for your excellent service.',
          'You helped an elderly customer carry their packages inside.'
        ],
        'Chef': [
          'You created a new dish that became an instant hit.',
          'You managed the kitchen during a particularly busy night.',
          'You received compliments from a food critic.',
          'You prepared a special meal for a customer with dietary restrictions.',
          'You trained a new kitchen staff member.'
        ],
        'Freelancer': [
          'You landed a high-paying client for your services.',
          'You completed a rush job with excellent quality.',
          'You received a five-star review for your work.',
          'You managed to juggle multiple projects simultaneously.',
          'You negotiated a better rate for your services.'
        ],
        'Mechanic': [
          'You fixed a complex engine problem that stumped other mechanics.',
          'You restored a vintage car to working condition.',
          'You diagnosed an issue quickly, saving the customer time and money.',
          'You worked overtime to finish an urgent repair.',
          'You provided helpful maintenance tips to a new car owner.'
        ],
        'Farmer': [
          'Your crops yielded an exceptional harvest this season.',
          'You successfully protected your fields from a pest infestation.',
          'You sold your produce at the local farmers market for a good price.',
          'You implemented a new irrigation system that saved water.',
          'You rescued livestock during a storm.'
        ],
        'Streamer': [
          'Your stream hit a new record of concurrent viewers.',
          'You received several generous donations during your broadcast.',
          'A clip from your stream went viral.',
          'You secured a sponsorship deal with a gaming company.',
          'Your subscriber count increased significantly after a successful event.'
        ],
        'Artist': [
          'You sold a painting to a prestigious collector.',
          'Your exhibition attracted a large crowd.',
          'You completed a commissioned artwork that exceeded expectations.',
          'You taught a successful workshop for aspiring artists.',
          'Your artwork was featured in a popular magazine.'
        ]
      };
      
      // Randomly select a job
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      
      // Randomly select a scenario for the job
      const scenario = scenarios[job.name][Math.floor(Math.random() * scenarios[job.name].length)];
      
      // Calculate earnings (random amount between min and max)
      const earnings = Math.floor(Math.random() * (job.earnings.max - job.earnings.min + 1)) + job.earnings.min;
      
      // Add bonus based on user level (5% per level)
      const levelBonus = Math.floor(earnings * (userCurrency.level * 0.05));
      
      // Initialize multipliers with default values
      let expMultiplier = 1.0;
      let moneyMultiplier = 1.0;
      let vipBonus = 0;
      let hasVIP = false;
      
      // Check for active boosters in inventory
      if (userCurrency.inventory && Array.isArray(userCurrency.inventory)) {
        const now = new Date();
        
        // Check for EXP boosters
        const activeExpBoosters = userCurrency.inventory.filter(item => 
          item.id === 'expbooster' && 
          item.expiry && 
          new Date(item.expiry) > now
        );
        
        // Check for Money boosters
        const activeMoneyBoosters = userCurrency.inventory.filter(item => 
          item.id === 'moneybooster' && 
          item.expiry && 
          new Date(item.expiry) > now
        );
        
        // Check for VIP status
        const activeVIP = userCurrency.inventory.find(item => 
          item.id === 'vip' && 
          item.expiry && 
          new Date(item.expiry) > now
        );
        
        // Apply EXP booster effect (50% increase per booster)
        if (activeExpBoosters.length > 0) {
          // Cap at 3 boosters maximum (250% total boost)
          const boosterCount = Math.min(activeExpBoosters.length, 3);
          expMultiplier += boosterCount * 0.5;
        }
        
        // Apply Money booster effect (50% increase per booster)
        if (activeMoneyBoosters.length > 0) {
          // Cap at 3 boosters maximum (250% total boost)
          const boosterCount = Math.min(activeMoneyBoosters.length, 3);
          moneyMultiplier += boosterCount * 0.5;
        }
        
        // Apply VIP bonus (25% additional earnings)
        if (activeVIP) {
          hasVIP = true;
          vipBonus = Math.floor(earnings * 0.25); // 25% bonus
        }
      }
      
      // Apply boosters to earnings
      const boostedEarnings = Math.floor(earnings * moneyMultiplier);
      const totalEarnings = boostedEarnings + levelBonus + vipBonus;
      
      // Update user's money
      userCurrency.money += totalEarnings;
      
      // Also add some exp for working with booster
      const baseExpGain = Math.floor(Math.random() * 5) + 1; // 1-5 exp
      const expGain = Math.floor(baseExpGain * expMultiplier);
      userCurrency.exp += expGain;
      
      // Check if user leveled up
      const oldLevel = userCurrency.level;
      const newLevel = Math.floor(Math.sqrt(userCurrency.exp / 100));
      
      if (newLevel > oldLevel) {
        // Store total XP accumulated before level up (work.js doesn't reset XP, but for consistency)
        const totalXPAccumulated = userCurrency.exp;

        userCurrency.level = newLevel;

        // Update bank capacity based on new level
        if (newLevel === 1) {
          userCurrency.bankCapacity = 5000;
        } else if (newLevel === 2) {
          userCurrency.bankCapacity = 7000;
        } else if (newLevel === 3) {
          userCurrency.bankCapacity = 10000;
        } else if (newLevel === 4) {
          userCurrency.bankCapacity = 15000;
        } else {
          userCurrency.bankCapacity = 15000 + ((newLevel - 4) * 5000);
        }

        // Add level up notification to global.client.rankups
        if (!global.client.rankups) {
          global.client.rankups = new Map();
        }

        global.client.rankups.set(senderID, {
          userID: senderID,
          threadID: threadID,
          level: newLevel,
          exp: totalXPAccumulated, // Show total accumulated XP
          money: userCurrency.money,
          bankCapacity: userCurrency.bankCapacity
        });
      }
      
      // Save changes
      await userCurrency.save();
      
      // Format response message
      let response = `💼 𝗪𝗢𝗥𝗞 𝗥𝗘𝗦𝗨𝗟𝗧\n\n`;
      response += `👤 @${user.name}\n`;
      response += `💼 Job: ${job.name}\n`;
      response += `📝 ${scenario}\n\n`;
      response += `💰 Base earnings: ${earnings} coins\n`;
      
      // Show booster effects if active
      if (moneyMultiplier > 1.0) {
        response += `🚀 Money booster (${Math.round((moneyMultiplier - 1.0) * 100)}%): ${boostedEarnings - earnings} coins\n`;
      }
      
      if (levelBonus > 0) {
        response += `⭐ Level bonus (${userCurrency.level * 5}%): ${levelBonus} coins\n`;
      }
      
      if (hasVIP && vipBonus > 0) {
        response += `🌟 VIP bonus (25%): ${vipBonus} coins\n`;
      }
      
      response += `💵 Total earned: ${totalEarnings} coins\n`;
      
      // Show base and boosted EXP
      if (expMultiplier > 1.0) {
        response += `📊 Base EXP: ${baseExpGain}\n`;
        response += `⚡ EXP booster (${Math.round((expMultiplier - 1.0) * 100)}%): +${expGain - baseExpGain}\n`;
        response += `📈 Total EXP gained: ${expGain}\n\n`;
      } else {
        response += `📊 EXP gained: ${expGain}\n\n`;
      }
      
      response += `💰 New balance: ${userCurrency.money} coins`;
      
      // Send result message
      return api.sendMessage(
        {
          body: response,
          mentions: [{ tag: `@${user.name}`, id: senderID }]
        },
        threadID,
        messageID
      );
      
    } catch (error) {
      global.logger.error('Error in work command:', error.message);
      return api.sendMessage('❌ An error occurred while processing your request.', threadID, messageID);
    }
  }
};