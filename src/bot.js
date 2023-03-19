// https://discord.com/developers/docs/interactions/application-commands
// Basic Bot (mon usage) https://github.com/discordjs/voice-examples/blob/main/basic/src/adapter.ts
// Radio Bot : https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts

// TODO passer de js en ts

const fs = require('fs');
const superagent = require('superagent');
const kaamelottbot = require('./kaamelott-audio');
const { client_id, token } = require('../conf/auth-prod.json');
const { baseUrl, fallbackBaseUrl } = require('../conf/config');
const { REST, Routes, Client } = require('discord.js');
const {	createAudioPlayer } = require("@discordjs/voice");
const logger = require('../conf/logger');
logger.level = 'debug';

const { GatewayIntentBits } = require("discord-api-types/v10");
const CHAT_INPUT = 1; // https://discord.com/developers/docs/resources/channel#channel-object-channel-types
const GUILD_VOICE = 2
const STRING = 3; // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
const BOOLEAN = 5;

async function startBot() {
    const slashCommandsResult = await registerSlashCommands();
    if(slashCommandsResult == false) {
        logger.error("Error registering Slash Commands, aborting");
        return;
    }

    const sounds = await parseSoundJson(baseUrl);
    if(sounds == null) {
        logger.error("Error parsing sounds (see above), aborting");
        return;
    }
    logger.info("Sounds parsed successfully : " + sounds.length + " episodes found.");

    const player = createAudioPlayer();
    if(player == null) {
        logger.error("Error creating audio player, aborting");
        return;
    }

    try {
        startClient(sounds, player);
    }
    catch(error) {
        logger.error("Error starting client : ", error);
    }
}

async function registerSlashCommands() {
    const commands = [
        {
            name: 'ping',
            description: 'Replies with Pong!',
        },
        {
            name: 'kaamelott',
            description: 'Play a Kaamelott quote in your voice channel',
            type: CHAT_INPUT,
            options: [
                {
                    name: 'tout',
                    description: 'The keyword to search for. Can be a character, an episode or a quote',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'texte',
                    description: 'Search in the text of the quote',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'perso',
                    description: 'Search when this character speaks',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'titre',
                    description: 'Search in the title of the episode',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'silencieux',
                    description: 'Do not play the sound, just display the quote',
                    type: BOOLEAN,
                    required: false,
                    channel_type: GUILD_VOICE,
                }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        logger.debug("Started refreshing application (/) commands : " + (commands.map(command => command.name)));
        await rest.put(Routes.applicationCommands(client_id), { body: commands });
        logger.info("Successfully reloaded application (/) commands.");
        return true;
    } catch (error) {
        logger.error("Error while refreshing application (/) commands : ", error);
    }

    return false;
}

async function parseSoundJson(url) {
    const fullUrl = url + "sounds.json";
    let response = null;

    try {
        response = await superagent.get(fullUrl);
    } catch (error) {
        logger.error("Error while fetching sound at " + fullUrl, error);

        // Try again with the fallback url
        if(url != fallbackBaseUrl) {
            return parseSoundJson(fallbackBaseUrl);
        }

        return null;
    }

    // The response is a JSON array, this is our episodes
    if(response.body && Array.isArray(response.body)) {
        return response.body;
    }

    // Try again from response.text (dirty hack 'cause of github...)
    if(response.text != null && response.text != "") {
        const sounds = JSON.parse(response.text);
        
        if(sounds && Array.isArray(sounds)) {
            return sounds;
        }
    }

    // Try again with the fallback url
    if(url != fallbackBaseUrl) {
        return parseSoundJson(fallbackBaseUrl);
    }

    logger.error("There is no sound array at " + fullUrl);
    return null;
}

function startClient(sounds, player) {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });

    client.on("ready", () => {
        logger.info("KaamelottBot is live ! C'est quoi que t'as pas compris ?");
    });
    
    client.on("interactionCreate", async (interaction) => {
        // The user sent a slash command
        if (interaction.isChatInputCommand()) {
            switch(interaction.commandName) {
                case 'ping': await interaction.reply('Pong!'); break;
                case 'kaamelott': await kaamelottbot.kaamelottAudio(interaction, sounds, player); break;
                // case 'kaamelottGif': await kaamelottbot.kaamelottGif(interaction, gifs); break;
            }

            return;
        }

        // The user clicked on a button
        if (interaction.isButton()) {
            if(interaction.customId == 'stopCurrentSound') {
                kaamelottbot.stopAudio(player);
            }
            else if(interaction.customId.startsWith('replayAudio_')) {
                const tempFilePath = interaction.customId.substring('replayAudio_'.length);
                // Use the content of the temp file as the filename
                const filename = fs.readFileSync(tempFilePath, 'utf8');
                
                logger.debug("Replaying file " + filename);
                kaamelottbot.playAudio(interaction, player, filename);
            }

            return;
        }
    });
    
    client.login(token);
}

startBot();
