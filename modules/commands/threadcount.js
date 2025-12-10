/**
 * Thread Count Checker
 * Shows database thread count vs actual Facebook threads
 */

module.exports = {
  config: {
    name: "threadcount",
    version: "1.0.0",
    permission: 'ADMIN',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Check thread count in database vs actual",
    category: "ADMIN",
    usages: "threadcount",
    cooldowns: 10
  },

  run: async function({ api, message, getText }) {
    const { threadID, messageID } = message;

    // Check if user is admin or owner
    if (!global.config.adminIDs.includes(message.senderID) && global.config.ownerID !== message.senderID) {
      return api.sendMessage("❌ You don't have permission to use this command.", threadID, messageID);
    }

    const startMessage = await api.sendMessage("🔍 Checking thread counts...", threadID, messageID);
    
    try {
      // Get database thread count
      const dbThreadCount = await global.Thread.countDocuments();
      
      // Update status
      await api.editMessage("📊 Database threads: " + dbThreadCount + "\n🔍 Fetching Facebook threads...", startMessage.messageID, threadID);
      
      // Try to get actual Facebook threads
      let facebookThreads = [];
      let method = 'unknown';
      
      // Method 1: Try pagination
      try {
        const allThreads = [];
        let timestamp = null;
        let pageCount = 0;
        const maxPages = 20; // Increased to support 200+ groups (20 pages × 50 threads = 1000 threads max)
        
        while (pageCount < maxPages) {
          try {
            const pageThreads = await new Promise((resolve, reject) => {
              api.getThreadList(50, timestamp, ['INBOX'], (err, threads) => {
                if (err) return reject(err);
                resolve(threads || []);
              });
            });
            
            if (!pageThreads || pageThreads.length === 0) break;
            
            allThreads.push(...pageThreads);
            timestamp = pageThreads[pageThreads.length - 1].timestamp;
            pageCount++;
            
            if (pageThreads.length < 50) break;
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (pageError) {
            break;
          }
        }
        
        // Remove duplicates
        const uniqueThreads = [];
        const seenThreads = new Set();
        
        for (const thread of allThreads) {
          if (thread.threadID && !seenThreads.has(thread.threadID)) {
            seenThreads.add(thread.threadID);
            uniqueThreads.push(thread);
          }
        }
        
        facebookThreads = uniqueThreads;
        method = 'Pagination';
        
      } catch (paginationError) {
        // Method 2: Try high limit
        try {
          facebookThreads = await new Promise((resolve, reject) => {
            api.getThreadList(200, null, ['INBOX'], (err, threads) => {
              if (err) return reject(err);
              resolve(threads || []);
            });
          });
          method = 'High Limit';
        } catch (highLimitError) {
          // Method 3: Try standard
          try {
            facebookThreads = await new Promise((resolve, reject) => {
              api.getThreadList(100, null, ['INBOX'], (err, threads) => {
                if (err) return reject(err);
                resolve(threads || []);
              });
            });
            method = 'Standard';
          } catch (standardError) {
            facebookThreads = [];
            method = 'Failed';
          }
        }
      }
      
      // Filter only threads where bot is participant
      let validThreads = 0;
      let checkedThreads = 0;
      
      if (facebookThreads.length > 0) {
        await api.editMessage(`📊 Database: ${dbThreadCount} threads\n🔍 Facebook: ${facebookThreads.length} threads\n⏳ Checking bot participation...`, startMessage.messageID, threadID);
        
        for (const threadInfo of facebookThreads) {
          try {
            const threadDetails = await new Promise((resolve, reject) => {
              api.getThreadInfo(threadInfo.threadID, (err, info) => {
                if (err) resolve(null);
                else resolve(info);
              });
            });
            
            if (threadDetails) {
              const botIsParticipant = threadDetails.participantIDs && 
                                     threadDetails.participantIDs.includes(global.client.botID);
              if (botIsParticipant) {
                validThreads++;
              }
            }
            checkedThreads++;
            
            // Update progress for every 10 threads
            if (checkedThreads % 10 === 0) {
              await api.editMessage(`📊 Database: ${dbThreadCount} threads\n🔍 Facebook: ${facebookThreads.length} threads\n✅ Valid threads: ${validThreads}/${checkedThreads} checked`, startMessage.messageID, threadID);
            }
            
          } catch (threadError) {
            checkedThreads++;
          }
        }
      }
      
      // Get some database stats
      const dbUsers = await global.User.countDocuments();
      const recentThreads = await global.Thread.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      // Final results
      const resultMessage = `📊 Thread Count Report\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🗃️ Database Statistics:\n` +
        `• Threads in DB: ${dbThreadCount}\n` +
        `• Users in DB: ${dbUsers}\n` +
        `• Active threads (7 days): ${recentThreads}\n\n` +
        `📱 Facebook Statistics:\n` +
        `• Total threads found: ${facebookThreads.length}\n` +
        `• Valid bot threads: ${validThreads}/${checkedThreads}\n` +
        `• Detection method: ${method}\n\n` +
        `${validThreads > dbThreadCount ? 
          `⚠️ Missing ${validThreads - dbThreadCount} threads in database!\n` +
          `💡 Use /syncthreads to fix this.` :
          validThreads === dbThreadCount ?
          `✅ Database is up to date!` :
          `ℹ️ Database may have extra/inactive threads.`
        }`;
      
      await api.editMessage(resultMessage, startMessage.messageID, threadID);
      
    } catch (error) {
      await api.editMessage(`❌ Thread count check failed: ${error.message}`, startMessage.messageID, threadID);
      global.logger.error('Thread count check error:', error);
    }
  }
};
