// https://discord.com/developers/docs/interactions/application-commands
// Basic Bot (mon usage) https://github.com/discordjs/voice-examples/blob/main/basic/src/adapter.ts
// Radio Bot : https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts

// TODO passer de js en ts

const fs = require('fs');
const superagent = require('superagent');
const kaamelottAudio = require('./kaamelott-audio');
const kaamelottGifs = require('./kaamelott-gifs');
const { client_id, token } = require('../conf/auth-prod.json');
const { audioBaseUrl, gifsBaseUrl } = require('../conf/config');
const { REST, Routes, Client, NewsChannel } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {	createAudioPlayer } = require("@discordjs/voice");
const logger = require('../conf/logger');
logger.level = 'debug';

const { GatewayIntentBits } = require("discord-api-types/v10");
const CHAT_INPUT = 1; // https://discord.com/developers/docs/resources/channel#channel-object-channel-types
const GUILD_VOICE = 2
const STRING = 3; // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
const BOOLEAN = 5;

let sounds = null;
let gifs = null;

async function startBot() {
    const slashCommandsResult = await registerSlashCommands();
    if(slashCommandsResult == false) {
        logger.error("Error registering Slash Commands, aborting");
        return;
    }

    sounds = await parseSoundJson(audioBaseUrl);
    if(sounds == null) {
        logger.error("Error parsing sounds (see above), aborting");
        return;

    }

    gifs = await parseGifsJson(gifsBaseUrl);
    if(gifs == null) {
        logger.error("Error parsing gifs (see above), aborting");
        return;
    }

    const player = createAudioPlayer();
    if(player == null) {
        logger.error("Error creating audio player, aborting");
        return;
    }

    try {
        startClient(player);
    }
    catch(error) {
        logger.error("Error starting client : ", error);
    }

    // Refresh sound list every 24 hours
    const tomorrow = 24 * 60 * 60 * 1000;
    logger.info("Refreshing sounds and gifs list every 24 hours. Next refresh at " + new Date(Date.now() + tomorrow).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}));
    setInterval(async () => {        
        sounds = await parseSoundJson(audioBaseUrl);
        gifs = await parseGifsJson(gifsBaseUrl);
    }
    , tomorrow);
}

async function registerSlashCommands() {
    const commands = [
        {
            name: 'ping',
            description: 'Replies with Pong!',
        },
        {
            name: 'kaamelott-audio',
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
        },
        {
            name: 'kaamelott-refresh-audio',
            description: 'Refresh sounds list by parsing sounds.json from github',
        },
        {
            name: 'kaamelott-clear-audio',
            description: 'Clear local cached audio files',
        },
        {
            name: 'kaamelott-gifs',
            description: 'Play a Kaamelott GIF in your channel',
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
                }
            ]
        },
        {
            name: 'kaamelott-refresh-gifs',
            description: 'Refresh gifs list by parsing gifs.json from github',
        },
        {
            name: 'kaamelott-clear-gifs',
            description: 'Clear local cached gifs files',
        },
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
        return null;
    }

    // The response is a JSON array, this is our episodes
    if(response.body && Array.isArray(response.body)) {
        logger.info("Sounds parsed successfully : " + sounds.length + " episodes found.");
        return response.body;
    }

    // Try again from response.text (dirty hack 'cause of github...)
    if(response.text != null && response.text != "") {
        const sounds = JSON.parse(response.text);
        
        if(sounds && Array.isArray(sounds)) {
            logger.info("Sounds parsed successfully : " + sounds.length + " episodes found.");
            return sounds;
        }
    }

    logger.error("There is no sound array at " + fullUrl);
    return null;
}

async function parseGifsJson(url) {
    const fullUrl = url + "gifs.json";
    let response = null;

    try {
        response = await superagent.get(fullUrl);
    } catch (error) {
        logger.error("Error while fetching sound at " + fullUrl, error);
        return null;
    }

    // The response is a JSON array, this is our episodes
    if(response.body && Array.isArray(response.body)) {
        logger.info("Gifs parsed successfully : " + sounds.length + " episodes found.");
        return response.body;
    }

    // Try again from response.text (dirty hack 'cause of github...)
    if(response.text != null && response.text != "") {
        const gifs = JSON.parse(response.text);
        
        if(gifs && Array.isArray(gifs)) {
            logger.info("Gifs parsed successfully : " + gifs.length + " image found.");
            return gifs;
        }
    }

    logger.error("There is no gifs array at " + fullUrl);
    return null;
}

function startClient(player) {
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
                case 'kaamelott-audio': await kaamelottAudio.kaamelottAudio(interaction, sounds, player); break;
                case 'kaamelott-refresh-audio': await refreshSoundsList(interaction); break;
                case 'kaamelott-clear-audio': await askToClearAudioCache(interaction); break;
                case 'kaamelott-gifs': await kaamelottGifs.kaamelottGifs(interaction, gifs); break;
                case 'kaamelott-refresh-gifs': await refreshGifsList(interaction); break;
                case 'kaamelott-clear-gifs': await askToClearGifsCache(interaction); break;                
            }

            return;
        }

        // The user clicked on a button
        if (interaction.isButton()) {
            if(interaction.customId == 'stopCurrentSound') {
                kaamelottAudio.stopAudio(player);
                interaction.reply({ content: 'Zuuuuuuuut !', ephemeral: true });
            } else if(interaction.customId.startsWith('replayAudio_')) {
                const tempFilePath = interaction.customId.substring('replayAudio_'.length);
                // Use the content of the temp file as the filename
                const filename = fs.readFileSync(tempFilePath, 'utf8');
                
                logger.debug("Replaying file " + filename);
                kaamelottAudio.playAudio(interaction.member?.voice.channel, player, filename);
                interaction.reply({ content: 'Replaying file ' + filename, ephemeral: true });
            } else if(interaction.customId == 'clearAudioCache') {
                clearAudioCache(interaction);
            } else if(interaction.customId == 'clearGifsCache') {
                clearGifsCache(interaction);
            }
            return;
        }
    });
    
    client.login(token);
}

async function refreshSoundsList(interaction = null) {
    // Check if the user is an admin
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    logger.info("Refreshing sounds list...");
    const refreshedSounds = await parseSoundJson(audioBaseUrl);
    if(refreshedSounds == null) {
        logger.error("Error refreshing sounds list, fallback to previous list");

        if(interaction != null) {
            interaction.reply({ content: 'Error refreshing sounds list, fallback to previous list', ephemeral: true });
        }
        return;
    }
    const oldSoundsCount = sounds.length;
    const newSoundsCount = refreshedSounds.length;
    sounds = refreshedSounds;
    if(interaction != null) {
        interaction.reply({ content: 'Succès ! ' + (newSoundsCount - oldSoundsCount) + " épisodes ajoutés. Total : " + newSoundsCount, ephemeral: true });
    }
}

async function refreshGifsList(interaction = null) {
    // Check if the user is an admin
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    logger.info("Refreshing gifs list...");
    const refreshedGifs = await parseGifsJson(gifsBaseUrl);
    if(refreshedGifs == null) {
        logger.error("Error refreshing gifs list, fallback to previous list");

        if(interaction != null) {
            interaction.reply({ content: 'Error refreshing gifs list, fallback to previous list', ephemeral: true });
        }
        return;
    }
    const oldGifsCount = gifs.length;
    const newGifsCount = refreshedGifs.length;
    gifs = refreshedGifs;
    if(interaction != null) {
        interaction.reply({ content: 'Succès ! ' + (newGifsCount - oldGifsCount) + " gifs ajoutés. Total : " + newGifsCount, ephemeral: true });
    }
}

// Clear local cached files
async function askToClearAudioCache(interaction) {
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Delete all the sounds in cache");

    const rowButtons = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
            .setCustomId('clearAudioCache')
            .setLabel('Are you sure ?')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚠️')
        );

    await interaction.reply({ embeds: [reply], components: [rowButtons], ephemeral: true });
}
// Clear local cached files
async function askToClearGifsCache(interaction) {
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Delete all the gifs in cache");

    const rowButtons = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
            .setCustomId('clearGifsCache')
            .setLabel('Are you sure ?')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚠️')
        );

    await interaction.reply({ embeds: [reply], components: [rowButtons], ephemeral: true });
}

async function clearAudioCache(interaction) {
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    kaamelottAudio.clearCache(interaction);
}

async function clearGifsCache(interaction) {
    if(!isAdmin(interaction.member)) {
        interaction.reply("You're not an admin !");
        return;
    }

    kaamelottGifs.clearCache(interaction);
}

function isAdmin(member) {
    if(member == null || member.roles == null || member.roles.cache == null) {
        logger.warn("Roles are null ! Member : ", member);
        return false;
    }
    return member.roles.cache.some(role => role.name === 'Admin');
}

startBot();
