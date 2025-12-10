/**
 * Translate Command
 * Translates replied message text to specified language
 */

const translate = require('@iamtraction/google-translate');

module.exports = {
    config: {
        name: 'translate',
        aliases: ['tr', 'trans'],
        description: 'Translate a message to any language',
        usage: '{prefix}translate <language_code>\\nReply to a message to translate it',
        credit: '𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭',
        hasPrefix: true,
        permission: 'PUBLIC',
        cooldown: 3,
        category: 'UTILITY'
    },

    run: async function ({ api, message, args }) {
        const { threadID, messageID, messageReply } = message;

        // Check if replying to a message
        if (!messageReply) {
            return api.sendMessage(
                '❌ Please reply to a message to translate it.\\n\\n' +
                'Usage: Reply to a message and type:\\n' +
                `${global.config.prefix}translate <language>\\n\\n` +
                'Examples:\\n' +
                `• ${global.config.prefix}translate en (English)\\n` +
                `• ${global.config.prefix}translate hi (Hindi)\\n` +
                `• ${global.config.prefix}translate ur (Urdu)\\n` +
                `• ${global.config.prefix}translate es (Spanish)\\n` +
                `• ${global.config.prefix}translate fr (French)\\n` +
                `• ${global.config.prefix}translate de (German)\\n` +
                `• ${global.config.prefix}translate ja (Japanese)\\n` +
                `• ${global.config.prefix}translate ko (Korean)\\n` +
                `• ${global.config.prefix}translate zh (Chinese)`,
                threadID,
                messageID
            );
        }

        // Check if language code provided
        if (!args[0]) {
            return api.sendMessage(
                `❌ Please specify a language code.\\n\\nExample: ${global.config.prefix}translate en`,
                threadID,
                messageID
            );
        }

        const targetLang = args[0].toLowerCase();
        const textToTranslate = messageReply.body;

        if (!textToTranslate) {
            return api.sendMessage(
                '❌ The replied message has no text to translate.',
                threadID,
                messageID
            );
        }

        try {
            // Send processing message
            const processingMsg = await api.sendMessage(
                `🔄 Translating to ${targetLang.toUpperCase()}...`,
                threadID
            );

            // Translate using Google Translate (free, no API key needed)
            const result = await translate(textToTranslate, { to: targetLang });

            // Language names for display
            const langNames = {
                en: 'English',
                hi: 'Hindi',
                ur: 'Urdu',
                es: 'Spanish',
                fr: 'French',
                de: 'German',
                ja: 'Japanese',
                ko: 'Korean',
                zh: 'Chinese',
                ar: 'Arabic',
                ru: 'Russian',
                pt: 'Portuguese',
                it: 'Italian',
                nl: 'Dutch',
                pl: 'Polish',
                tr: 'Turkish',
                vi: 'Vietnamese',
                th: 'Thai',
                id: 'Indonesian',
                bn: 'Bengali',
                ta: 'Tamil',
                te: 'Telugu',
                mr: 'Marathi',
                gu: 'Gujarati',
                kn: 'Kannada',
                ml: 'Malayalam',
                pa: 'Punjabi'
            };

            const sourceLangName = langNames[result.from.language.iso] || result.from.language.iso.toUpperCase();
            const targetLangName = langNames[targetLang] || targetLang.toUpperCase();

            // Edit the processing message with translated text
            const response = `🌐 Translation\\n\\n` +
                `From: ${sourceLangName}\\n` +
                `To: ${targetLangName}\\n\\n` +
                `━━━━━━━━━━━━━━━\\n${result.text}`;

            api.editMessage(response, processingMsg.messageID);

        } catch (error) {
            console.error('Translation error:', error);

            let errorMsg = '❌ Translation failed. ';

            if (error.message && error.message.includes('language')) {
                errorMsg += `Invalid language code: "${targetLang}". Please use a valid language code like en, hi, ur, etc.`;
            } else if (error.code === 'BAD_REQUEST') {
                errorMsg += 'The text could not be translated. Please try again.';
            } else {
                errorMsg += 'Please try again later.';
            }

            api.sendMessage(errorMsg, threadID, messageID);
        }
    }
};
