const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "code",
    aliases: ["codeedit", "codemanage"],
    description: "View, edit, create, delete, or rename code files",
    usage: "{prefix}code [view|edit|create|delete|rename] [file_path] [new_code or new_file_name]",
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: true,
    permission: "ADMIN",
    cooldown: 3,
    category: "SYSTEM",
  },

  run: async function ({ api, message, args, event }) {
    const { threadID, messageID, senderID, messageReply } = message;
    
    // If messageReply exists in message, use it; otherwise use event.messageReply if available
    const replyMessage = messageReply || (event && event.messageReply);

    try {
      // Check permissions
      if (
        !global.config.adminIDs.includes(senderID) &&
        senderID !== global.config.ownerID
      ) {
        return api.sendMessage(
          "❌ You do not have permission to use this command.",
          threadID,
          messageID,
        );
      }

      // Check if enough arguments are provided
      if (args.length < 2) {
        return api.sendMessage(
          "❌ Not enough arguments provided.\n" +
            `Usage:\n` +
            `• ${global.config.prefix}code view [file_path] - View a file's content\n` +
            `• ${global.config.prefix}code edit [file_path] [new_code] - Edit a file\n` +
            `• ${global.config.prefix}code create [file_path] [code] - Create a new file\n` +
            `• ${global.config.prefix}code delete [file_path] - Delete a file\n` +
            `• ${global.config.prefix}code rename [old_path] [new_path] - Rename a file`,
          threadID,
          messageID,
        );
      }

      const action = args[0].toLowerCase();
      let filePath = args[1];

      // Handle file path
      if (!filePath.includes("/") && !filePath.includes("\\")) {
        // If it's just a filename, assume it's in the commands directory
        if (!filePath.endsWith(".js")) {
          filePath += ".js";
        }
        filePath = path.join(process.cwd(), "modules", "commands", filePath);
      } else if (!path.isAbsolute(filePath)) {
        // If it's a relative path, make it absolute
        filePath = path.join(process.cwd(), filePath);
      }

      // Check if we need to get code from a pastebin link in a reply
      let newCode = "";
      if ((action === "edit" || action === "create") && args.length < 3) {
        // Check if there's a reply message with a pastebin link
        if (replyMessage && replyMessage.body) {
          const replyContent = replyMessage.body;

          // Check if the reply contains a pastebin link
          const pastebinRegex =
            /(https?:\/\/(www\.)?pastebin\.com\/(raw\/)?[a-zA-Z0-9]+)/i;
          const match = replyContent.match(pastebinRegex);

          if (match) {
            const pastebinUrl = match[1];
            const rawUrl = pastebinUrl.includes("/raw/")
              ? pastebinUrl
              : pastebinUrl.replace("pastebin.com/", "pastebin.com/raw/");

            try {
              api.sendMessage(
                "🔄 Fetching code from Pastebin...",
                threadID,
                messageID,
              );
              const response = await axios.get(rawUrl);
              newCode = response.data;
            } catch (error) {
              return api.sendMessage(
                `❌ Failed to fetch code from Pastebin: ${error.message}`,
                threadID,
                messageID,
              );
            }
          } else {
            // If no pastebin link found, use the reply content as the code
            newCode = replyContent;
          }
        } else {
          return api.sendMessage(
            "❌ For edit or create actions, you need to either provide the code as the third argument or reply to a message containing the code or a Pastebin link.",
            threadID,
            messageID,
          );
        }
      } else if (
        (action === "edit" || action === "create") &&
        args.length >= 3
      ) {
        // Get the code from the arguments preserving multi-line formatting
        // Try to preserve newlines and formatting exactly as typed
        // Safely extract multiline code from the message body
        const rawMessage = message.body || "";
        const startIndex =
          rawMessage.indexOf(args[0]) + args[0].length + 1 + args[1].length + 1;
        newCode = rawMessage.slice(startIndex).trim();
      }

      // Perform the requested action
      switch (action) {
        case "view": {
          if (!fs.existsSync(filePath)) {
            return api.sendMessage(
              `❌ File not found: ${filePath}`,
              threadID,
              messageID,
            );
          }

          const fileContent = fs.readFileSync(filePath, "utf8");
          const fileName = path.basename(filePath);

          return api.sendMessage(
            `📄 File: ${fileName}\n` + `📝 Content:\n\n` + `${fileContent}`,
            threadID,
            messageID,
          );
        }

        case "edit": {
          if (!fs.existsSync(filePath)) {
            return api.sendMessage(
              `❌ File not found: ${filePath}`,
              threadID,
              messageID,
            );
          }

          // Backup the original file content
          const originalContent = fs.readFileSync(filePath, "utf8");
          const fileName = path.basename(filePath);

          try {
            const commandName = path.basename(filePath, ".js");

            // If it's a command file, test reload before saving
            if (
              filePath.includes("modules/commands") ||
              filePath.includes("modules\\commands")
            ) {
              try {
                // Write to a temp file to test reload
                const tempPath = filePath + ".temp";
                fs.writeFileSync(tempPath, newCode, "utf8");

                // Attempt to reload from temp
                delete require.cache[require.resolve(tempPath)];
                require(tempPath); // if there's syntax error, it will throw

                // Passed, now write permanently
                fs.writeFileSync(filePath, newCode, "utf8");
                fs.unlinkSync(tempPath);

                const reloadSuccess = global.loader.reloadCommand(commandName);
                return api.sendMessage(
                  `✅ Successfully edited file: ${path.basename(filePath)}\n` +
                    (reloadSuccess ? "✅ Command reloaded successfully!" : ""),
                  threadID,
                  messageID,
                );
              } catch (error) {
                // On error, remove temp file and do not update
                if (fs.existsSync(filePath + ".temp"))
                  fs.unlinkSync(filePath + ".temp");
                return api.sendMessage(
                  `❌ Reload failed: ${error.message}\n` +
                    `⚠️ File was not modified.`,
                  threadID,
                  messageID,
                );
              }
            } else {
              // Not a command file — just save it
              fs.writeFileSync(filePath, newCode, "utf8");

              return api.sendMessage(
                `✅ Successfully edited file: ${fileName}`,
                threadID,
                messageID,
              );
            }
          } catch (error) {
            // If an error occurs, try to restore the original content
            try {
              fs.writeFileSync(filePath, originalContent, "utf8");
            } catch (restoreError) {
              // If restore fails, inform the user
              return api.sendMessage(
                `❌ Error editing file: ${error.message}\n` +
                  `❌ Failed to restore original content: ${restoreError.message}`,
                threadID,
                messageID,
              );
            }

            return api.sendMessage(
              `❌ Error editing file: ${error.message}\n` +
                `File has been restored to its original state.`,
              threadID,
              messageID,
            );
          }
        }

        case "create": {
          // Check if the file already exists
          if (fs.existsSync(filePath)) {
            return api.sendMessage(
              `❌ File already exists: ${filePath}\n` +
                `Use 'edit' action to modify existing files.`,
              threadID,
              messageID,
            );
          }

          // Ensure the directory exists
          const dirPath = path.dirname(filePath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          const fileName = path.basename(filePath);
          const commandName = path.basename(filePath, ".js");

          // If it's a command file, test before saving
          if (
            filePath.includes("modules/commands") ||
            filePath.includes("modules\\commands")
          ) {
            try {
              // Write to a temporary test file
              const tempPath = filePath + ".temp";
              fs.writeFileSync(tempPath, newCode, "utf8");

              // Attempt to require the temp file to check for syntax errors
              delete require.cache[require.resolve(tempPath)];
              require(tempPath); // will throw if syntax is invalid

              // Passed validation, now write permanently and delete temp
              fs.writeFileSync(filePath, newCode, "utf8");
              fs.unlinkSync(tempPath);

              // Attempt to load command
              const loadSuccess = global.loader.reloadCommand(commandName);
              return api.sendMessage(
                `✅ Successfully created file: ${fileName}\n` +
                  (loadSuccess ? "✅ Command loaded successfully!" : ""),
                threadID,
                messageID,
              );
            } catch (error) {
              if (fs.existsSync(filePath + ".temp"))
                fs.unlinkSync(filePath + ".temp");
              return api.sendMessage(
                `❌ Error creating command file: ${error.message}\n` +
                  `⚠️ File was not created.`,
                threadID,
                messageID,
              );
            }
          } else {
            // Just a normal file, write directly
            try {
              fs.writeFileSync(filePath, newCode, "utf8");
              return api.sendMessage(
                `✅ Successfully created file: ${fileName}`,
                threadID,
                messageID,
              );
            } catch (error) {
              return api.sendMessage(
                `❌ Error creating file: ${error.message}`,
                threadID,
                messageID,
              );
            }
          }
        }

        case "delete": {
          if (!fs.existsSync(filePath)) {
            return api.sendMessage(
              `❌ File not found: ${filePath}`,
              threadID,
              messageID,
            );
          }

          try {
            const fileName = path.basename(filePath);

            // If it's a command file, remove it from the commands list first
            if (
              filePath.includes("modules/commands") ||
              filePath.includes("modules\\commands")
            ) {
              const commandName = path.basename(filePath, ".js");
              // Remove command from cache and client
              delete require.cache[require.resolve(filePath)];
              global.client.commands.delete(commandName);

              // Also remove any aliases
              for (const [key, cmd] of global.client.commands.entries()) {
                if (cmd.config && cmd.config.name === commandName) {
                  global.client.commands.delete(key);
                }
              }
            }

            // Delete the file
            fs.unlinkSync(filePath);

            return api.sendMessage(
              `✅ Successfully deleted file: ${fileName}`,
              threadID,
              messageID,
            );
          } catch (error) {
            return api.sendMessage(
              `❌ Error deleting file: ${error.message}`,
              threadID,
              messageID,
            );
          }
        }

        case "rename": {
          if (!fs.existsSync(filePath)) {
            return api.sendMessage(
              `❌ File not found: ${filePath}`,
              threadID,
              messageID,
            );
          }

          if (args.length < 3) {
            return api.sendMessage(
              "❌ Not enough arguments for rename action.\n" +
                `Usage: ${global.config.prefix}code rename [old_path] [new_path]`,
              threadID,
              messageID,
            );
          }

          let newFilePath = args[2];

          // Handle new file path
          if (!newFilePath.includes("/") && !newFilePath.includes("\\")) {
            // If it's just a filename, assume it's in the same directory as the original file
            if (!newFilePath.endsWith(".js") && filePath.endsWith(".js")) {
              newFilePath += ".js";
            }
            newFilePath = path.join(path.dirname(filePath), newFilePath);
          } else if (!path.isAbsolute(newFilePath)) {
            // If it's a relative path, make it absolute
            newFilePath = path.join(process.cwd(), newFilePath);
          }

          // Check if the destination file already exists
          if (fs.existsSync(newFilePath)) {
            return api.sendMessage(
              `❌ Destination file already exists: ${newFilePath}`,
              threadID,
              messageID,
            );
          }

          try {
            const oldFileName = path.basename(filePath);
            const newFileName = path.basename(newFilePath);

            // If it's a command file, remove it from the commands list first
            if (
              filePath.includes("modules/commands") ||
              filePath.includes("modules\\commands")
            ) {
              const commandName = path.basename(filePath, ".js");
              // Remove command from cache and client
              delete require.cache[require.resolve(filePath)];
              global.client.commands.delete(commandName);

              // Also remove any aliases
              for (const [key, cmd] of global.client.commands.entries()) {
                if (cmd.config && cmd.config.name === commandName) {
                  global.client.commands.delete(key);
                }
              }
            }

            // Ensure the destination directory exists
            const dirPath = path.dirname(newFilePath);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }

            // Rename the file
            fs.renameSync(filePath, newFilePath);

            // If it's a command file, try to reload it with the new name
            let reloadSuccess = false;
            if (
              newFilePath.includes("modules/commands") ||
              newFilePath.includes("modules\\commands")
            ) {
              const newCommandName = path.basename(newFilePath, ".js");
              try {
                reloadSuccess = global.loader.reloadCommand(newCommandName);
              } catch (reloadError) {
                // If reload fails, inform the user but don't revert the rename
                return api.sendMessage(
                  `✅ File renamed from ${oldFileName} to ${newFileName}\n` +
                    `⚠️ Warning: Error loading renamed command: ${reloadError.message}`,
                  threadID,
                  messageID,
                );
              }
            }

            return api.sendMessage(
              `✅ Successfully renamed file from ${oldFileName} to ${newFileName}\n` +
                (reloadSuccess ? "✅ Command reloaded successfully!" : ""),
              threadID,
              messageID,
            );
          } catch (error) {
            return api.sendMessage(
              `❌ Error renaming file: ${error.message}`,
              threadID,
              messageID,
            );
          }
        }

        default:
          return api.sendMessage(
            `❌ Unknown action: ${action}\n` +
              `Valid actions are: view, edit, create, delete, rename`,
            threadID,
            messageID,
          );
      }
    } catch (error) {
      global.logger?.error("Error in code command:", error.message);
      return api.sendMessage(
        `❌ An error occurred: ${error.message}`,
        threadID,
        messageID,
      );
    }
  },
};
