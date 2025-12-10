/**
 * Group Management Command
 * Manage group settings like name, emoji, and image
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "group",
    aliases: ["grp"],
    description: "Manage group settings (name, emoji, image)",
    usages: "{prefix}group <name/emoji/image> <value>",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    category: "ADMIN",
    hasPrefix: true,
    permission: "ADMIN",
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
    const { threadID, messageID, senderID } = message;
    
    // Check if user has admin permission in the group
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID) || global.config.ownerID === senderID;
      
      if (!isAdmin) {
        return api.sendMessage("❌ You need to be a group admin to use this command!", threadID, messageID);
      }
    } catch (error) {
      return api.sendMessage("❌ Failed to check admin permissions. Make sure bot is admin in this group.", threadID, messageID);
    }
    
    // Show help if no arguments
    if (!args || args.length === 0) {
      const helpMessage = `📋 Group Management Commands:\n\n` +
        `1️⃣ ${global.config.prefix}group name <new name>\n` +
        `   • Change group name\n` +
        `   • Example: ${global.config.prefix}group name My Awesome Group\n\n` +
        `2️⃣ ${global.config.prefix}group emoji <emoji>\n` +
        `   • Change group emoji\n` +
        `   • Example: ${global.config.prefix}group emoji 🎉\n\n` +
        `3️⃣ ${global.config.prefix}group image\n` +
        `   • Change group photo (reply to image)\n` +
        `   • Example: Reply to an image with ${global.config.prefix}group image\n\n` +
        `4️⃣ ${global.config.prefix}group adminadd @mention\n` +
        `   • Make a user group admin\n` +
        `   • Example: ${global.config.prefix}group adminadd @username\n\n` +
        `💡 Note: You must be a group admin to use these commands.`;
      
      return api.sendMessage(helpMessage, threadID, messageID);
    }
    
    const subCommand = args[0].toLowerCase();
    
    try {
      switch (subCommand) {
        case 'name':
          await handleGroupName(api, message, args.slice(1));
          break;
          
        case 'emoji':
          await handleGroupEmoji(api, message, args.slice(1));
          break;
          
        case 'image':
        case 'photo':
        case 'pic':
          await handleGroupImage(api, message);
          break;
          
        case 'adminadd':
        case 'addadmin':
          await handleAdminAdd(api, message);
          break;
          
        default:
          return api.sendMessage(`❌ Invalid subcommand: ${subCommand}\n\nUse: ${global.config.prefix}group to see available options.`, threadID, messageID);
      }
    } catch (error) {
      console.error("Group command error:", error);
      return api.sendMessage("❌ An error occurred while processing the command. Please try again.", threadID, messageID);
    }
  }
};

/**
 * Handle group name change
 */
async function handleGroupName(api, message, args) {
  const { threadID, messageID } = message;
  
  if (!args || args.length === 0) {
    return api.sendMessage("❌ Please provide a new group name!\n\nExample: group name My New Group", threadID, messageID);
  }
  
  const newName = args.join(" ");
  
  if (newName.length > 100) {
    return api.sendMessage("❌ Group name is too long! Maximum 100 characters allowed.", threadID, messageID);
  }
  
  try {
    const statusMsg = await api.sendMessage("🔄 Changing group name...", threadID);
    
    await api.setTitle(newName, threadID);
    
    // Update database manually since event might not trigger for bot changes
    try {
      if (global.controllers && global.controllers.thread) {
        await global.controllers.thread.createOrUpdateThread(threadID, {
          threadName: newName
        });
        global.logger.database(`Updated thread name in database: ${threadID} (${newName})`);
      }
    } catch (dbError) {
      console.error("Error updating database:", dbError);
    }
    
    return api.editMessage(`✅ Group name changed successfully!\n📝 New name: "${newName}"`, statusMsg.messageID);
  } catch (error) {
    console.error("Error changing group name:", error);
    return api.sendMessage("❌ Failed to change group name. Make sure the bot has admin permissions.", threadID, messageID);
  }
}

/**
 * Handle group emoji change
 */
async function handleGroupEmoji(api, message, args) {
  const { threadID, messageID } = message;
  
  if (!args || args.length === 0) {
    return api.sendMessage("❌ Please provide an emoji!\n\nExample: group emoji 🎉", threadID, messageID);
  }
  
  const emoji = args[0];
  
  // Basic emoji validation
  if (emoji.length > 10) {
    return api.sendMessage("❌ Please provide a valid emoji!", threadID, messageID);
  }
  
  try {
    const statusMsg = await api.sendMessage("🔄 Changing group emoji...", threadID);
    
    await api.changeThreadEmoji(emoji, threadID);
    
    return api.editMessage(`✅ Group emoji changed successfully!\n${emoji} New emoji: ${emoji}`, statusMsg.messageID);
  } catch (error) {
    console.error("Error changing group emoji:", error);
    return api.sendMessage("❌ Failed to change group emoji. Make sure the bot has admin permissions and the emoji is valid.", threadID, messageID);
  }
}

/**
 * Handle group image change
 */
async function handleGroupImage(api, message) {
  const { threadID, messageID, messageReply } = message;
  
  // Check if message is a reply to an image
  if (!messageReply) {
    return api.sendMessage("❌ Please reply to an image with this command!\n\nExample: Reply to a photo with 'group image'", threadID, messageID);
  }
  
  // Check if replied message has attachments
  if (!messageReply.attachments || messageReply.attachments.length === 0) {
    return api.sendMessage("❌ The replied message doesn't contain any image!", threadID, messageID);
  }
  
  // Find image attachment
  const imageAttachment = messageReply.attachments.find(att => att.type === 'photo');
  
  if (!imageAttachment) {
    return api.sendMessage("❌ The replied message doesn't contain an image! Please reply to a photo.", threadID, messageID);
  }
  
  try {
    const statusMsg = await api.sendMessage("🔄 Changing group image...", threadID);
    
    // Download image
    const imageUrl = imageAttachment.url || imageAttachment.href;
    const tempDir = path.join(__dirname, '../../temporary');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filename = `group_image_${Date.now()}.jpg`;
    const filepath = path.join(tempDir, filename);
    
    // Update status: downloading image
    api.editMessage("🔄 Downloading image...", statusMsg.messageID);
    
    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Update status: setting group image
    api.editMessage("🔄 Setting as group image...", statusMsg.messageID);
    
    // Change group image
    const imageStream = fs.createReadStream(filepath);
    await api.changeGroupImage(imageStream, threadID);
    
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (e) {
        console.log("Failed to cleanup temp file:", filepath);
      }
    }, 5000);
    
    return api.editMessage("✅ Group image changed successfully! 📸", statusMsg.messageID);
    
  } catch (error) {
    console.error("Error changing group image:", error);
    return api.sendMessage("❌ Failed to change group image. Make sure the bot has admin permissions and the image is valid.", threadID, messageID);
  }
}

/**
 * Handle adding user as group admin
 */
async function handleAdminAdd(api, message) {
  const { threadID, messageID, mentions } = message;
  
  // Check if user is mentioned
  if (!mentions || Object.keys(mentions).length === 0) {
    return api.sendMessage("❌ Please mention a user to make admin!\n\nExample: group adminadd @username", threadID, messageID);
  }
  
  const mentionedUserID = Object.keys(mentions)[0];
  const mentionedUserName = mentions[mentionedUserID].replace('@', '');
  
  try {
    // Check if bot has admin permissions
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id === botID);
    
    if (!isBotAdmin) {
      return api.sendMessage("❌ Bot needs to be an admin to make other users admin!", threadID, messageID);
    }
    
    // Check if user is already an admin
    const isAlreadyAdmin = threadInfo.adminIDs.some(admin => admin.id === mentionedUserID);
    
    if (isAlreadyAdmin) {
      return api.sendMessage(`❌ ${mentionedUserName} is already a group admin!`, threadID, messageID);
    }
    
    // Check if mentioned user is in the group
    const isUserInGroup = threadInfo.participantIDs.includes(mentionedUserID);
    
    if (!isUserInGroup) {
      return api.sendMessage(`❌ ${mentionedUserName} is not a member of this group!`, threadID, messageID);
    }
    
    const statusMsg = await api.sendMessage(`🔄 Making ${mentionedUserName} a group admin...`, threadID);
    
    // Make user admin
    await api.changeAdminStatus(threadID, mentionedUserID, true);
    
    return api.editMessage(
      `✅ Successfully made ${mentionedUserName} a group admin!\n\n👑 New Admin: @${mentionedUserName}\n🎉 They can now manage this group.`,
      statusMsg.messageID
    );
    
  } catch (error) {
    console.error("Error making user admin:", error);
    
    let errorMessage = "❌ Failed to make user admin. ";
    
    if (error.message && error.message.includes('permission')) {
      errorMessage += "Bot doesn't have permission to make admins.";
    } else if (error.message && error.message.includes('not found')) {
      errorMessage += "User not found in this group.";
    } else {
      errorMessage += "Please try again later.";
    }
    
    return api.sendMessage(errorMessage, threadID, messageID);
  }
}
