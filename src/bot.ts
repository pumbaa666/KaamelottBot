// https://discord.com/developers/docs/interactions/application-commands
// Basic Bot (mon usage) https://github.com/discordjs/voice-examples/blob/main/basic/src/adapter.ts
// Radio Bot : https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts

// TODO Les erreurs ne sont pas loggée dans ./logs, mais visibles dans `journalctl -xe` (en tout cas quand le bot est démarré en tant que service)

const path = require('path');
const fs = require('fs');
const superagent = require('superagent');
const kaamelottAudio = require('./kaamelott-audio');
const kaamelottGifs = require('./kaamelott-gifs');
const { client_id, token } = require('../conf/auth-prod.json');
const { audioBaseUrl, gifsBaseUrl } = require('../conf/config');
const { REST, Routes, Client } = require('discord.js');
const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const { Interaction, Role, Member, VoiceChannel } = require('discord.js');
const {	createAudioPlayer, AudioPlayer } = require("@discordjs/voice");
// const logger2 = require('../conf/logger');
import { logger } from "../conf/logger";
logger.level = 'debug';

const { GatewayIntentBits } = require("discord-api-types/v10");
const CHAT_INPUT = 1; // https://discord.com/developers/docs/resources/channel#channel-object-channel-types
const GUILD_TEXT = 0;
const GUILD_VOICE = 2
const STRING = 3; // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
const BOOLEAN = 5;
const ADMINISTRATOR = 8;

let sounds: Sound[] = null;
let gifs: Gif[] = null;

type Sound = {
    character: string;
    episode: string;
    file: string;
    title: string;
};

type Gif = {
    quote: string, // title / text
    characters: string[];
    characters_speaking: string[];
    filename: string;
};

type User = {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    public_flags: number;
    bot: boolean;
};

type Option = {
    name: string;
    value: string;
};

// type Member = { // TODO check la doc que c'est bien ça
//     user: User;
//     nick: string;
//     roles: string[];
//     joined_at: string;
//     premium_since: string;
//     deaf: boolean;
//     mute: boolean;
//     pending: boolean;
//     permissions: string;
// };

// Entry point
async function startBot() {
    const slashCommandsResult = await registerSlashCommands();
    if(slashCommandsResult == false) {
        logger.error("Error registering Slash Commands, aborting");
        return;
    }

    await parseAudioJson(audioBaseUrl);
    if(sounds == null) {
        logger.error("Error parsing sounds (see above), aborting");
        return;
    }

    await parseGifsJson(gifsBaseUrl);
    if(gifs == null) {
        logger.error("Error parsing gifs (see above), aborting");
        return;
    }

    const player: typeof AudioPlayer = createAudioPlayer();
    if(player == null) {
        logger.error("Error creating audio player, aborting");
        return;
    }

    try {
        startClient(player);
    }
    catch(error) {
        logger.error("Error starting client : ", error);
        return;
    }

    // Refresh sound list every 24 hours
    const tomorrow = 24 * 60 * 60 * 1000;
    logger.info("Refreshing sounds and gifs list every 24 hours. Next refresh at " + new Date(Date.now() + tomorrow).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}));
    setInterval(async () => {        
        await parseAudioJson(audioBaseUrl);
        await parseGifsJson(gifsBaseUrl);
    }
    , tomorrow);
}

// Define all the commands of the bot
// Note : kick the bot from the Discord channel before you update the commands
// and then re-invite it
async function registerSlashCommands(): Promise<boolean> {
    const commands = [
        {
            name: 'ping',
            description: 'Replies with Pong!',
        },
        {
            name: 'kaamelott-audio',
            description: 'Play a Kaamelott quote in your voice channel',
            type: CHAT_INPUT,
            channel_type: GUILD_VOICE,
            options: [
                {
                    name: 'tout',
                    description: 'The keyword to search for. Can be a character, an episode or a quote',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'texte',
                    description: 'Search in the text of the quote',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'perso',
                    description: 'Search when this character speaks',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'titre',
                    description: 'Search in the title of the episode',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'silencieux',
                    description: 'Do not play the sound, just display the quote',
                    type: BOOLEAN,
                    required: false,
                }
            ]
        },
        {
            name: 'kaamelott-gifs',
            description: 'Play a Kaamelott GIF in your channel',
            type: CHAT_INPUT,
            channel_type: GUILD_TEXT,
            options: [
                {
                    name: 'tout',
                    description: 'The keyword to search for. Can be a character, an episode or a quote',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'texte',
                    description: 'Search in the text of the quote',
                    type: STRING,
                    required: false,
                },
                {
                    name: 'perso',
                    description: 'Search when this character speaks',
                    type: STRING,
                    required: false,
                }
            ]
        },
        {
            name: 'kaamelott-refresh',
            description: 'Force the refresh of the sounds/gifs list by parsing JSON from github',
            default_member_permissions: ADMINISTRATOR,
            type: CHAT_INPUT,
            options: [
                {
                    name: 'audio',
                    description: 'Refresh audio list. Use only one option at a time.',
                    type: BOOLEAN,
                    required: false,
                },
                {
                    name: 'gifs',
                    description: 'Refresh gifs list. Use only one option at a time.',
                    type: BOOLEAN,
                    required: false,
                }
            ]
        },
        {
            name: 'kaamelott-clear',
            description: 'Clear local cached audio/gifs files.',
            default_member_permissions: ADMINISTRATOR,
            type: CHAT_INPUT,
            options: [
                {
                    name: 'audio',
                    description: 'Clear audio list. Use only one option at a time.',
                    type: BOOLEAN,
                    required: false,
                },
                {
                    name: 'gifs',
                    description: 'Clear gifs list. Use only one option at a time.',
                    type: BOOLEAN,
                    required: false,
                }
            ]
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

async function parseGifsJson(url: string) {
    const result = await parseJson(url, "gifs");
    if(result != null) {
        gifs = result;
    }
}

async function parseAudioJson(url: string) {
    const result = await parseJson(url, "sounds");
    if(result != null) {    
        sounds = result;
    }
}

// Parse a JSON file from a URL and return an array of objects (Sounds or Gifs)
async function parseJson(url: string, type: string) { // TODO Type as an enum
    const fullUrl = url + type + ".json";
    let response = null;

    try {
        response = await superagent.get(fullUrl);
    } catch (error) {
        logger.error("Error while fetching " + type + " at " + fullUrl, error);
        return null;
    }

    // The response is a JSON array, this is our episodes
    if(response.body && Array.isArray(response.body)) {
        logger.info(type + " parsed successfully : " + response.body.length + " found.");
        return response.body;
    }

    // Try again from response.text (dirty hack 'cause of github...)
    if(response.text != null && response.text != "") {
        const list = JSON.parse(response.text);
        
        if(list && Array.isArray(list)) {
            logger.info(type + " parsed successfully : " + list.length + " found.");
            return list;
        }
    }

    logger.error("There are no " + type + " array at " + fullUrl);
    return null;
}

// Refresh the Audio or Gifs list by parsing the appropriate json file from github
async function refreshList(interaction: typeof Interaction, type: string, url: string, oldCount: number) {
    // Check if the user is an admin
    if(!isAdmin(interaction.member)) {
        await interaction.editReply({ content: "You're not an admin !" });
        return null;
    }

    logger.info("Refreshing " + type + " list...");
    const refreshed = await parseJson(url, type);
    if(refreshed == null) {
        logger.error("Error refreshing " + type + " list, fallback to previous list");

            await interaction.editReply({ content: "Error refreshing " + type + " list, fallback to previous list" });
        return null;
    }

    const newCount = refreshed.length;
    await interaction.editReply({ content: "Succès ! " + (newCount - oldCount) + " " + type + " ajoutés. Total : " + newCount });

    return refreshed;
}

// Register the bot on Discord and start listening to events
function startClient(player: typeof AudioPlayer) {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });

    client.on("ready", () => {
        logger.info("KaamelottBot is live ! C'est quoi que t'as pas compris ?");
    });
    
    client.on("interactionCreate", async (interaction: typeof Interaction) => {
        // The user sent a slash command
        if (interaction.isChatInputCommand()) {
            // const sassyFile = new File("./resources/eye-on-you.gif", "eye-on-you.gif");
            const filename = "eye-on-you.gif";
            const sassyFile = new AttachmentBuilder("./resources/"+filename);
            sassyFile.setName(filename);
            const sassyReply = new EmbedBuilder()
                .setTitle("Merci de m'appeler pour rien !! 😡")
                .setDescription("Tu vois ce que tu me fais coder ???")
                .setImage("attachment://"+filename)
                .setFooter({ text: 'Je te crache au visage, tient ! Pteuh !' }, [sassyFile]);
                
            switch(interaction.commandName) {
                case 'ping': await interaction.reply('Pong!'); break;
                case 'kaamelott-audio': await kaamelottAudio.searchAndReplyAudio(interaction, sounds, player, getCacheFilePath("", "sounds")); break;
                case 'kaamelott-gifs': await kaamelottGifs.searchAndReplyGif(interaction, gifs, null, getCacheFilePath("", "gifs")); break;
                case 'kaamelott-refresh':
                    await interaction.reply({ content: "En cours de refresh...", ephemeral: true });
                    if(interaction.options.getBoolean('audio')) {
                        await refreshList(interaction, "sounds", audioBaseUrl, sounds.length);
                    }
                    if(interaction.options.getBoolean('gifs')) {
                        await refreshList(interaction, "gifs", gifsBaseUrl, gifs.length);
                    }
                    if(!interaction.options.getBoolean('gifs') && !interaction.options.getBoolean('audio')) {
                        await interaction.editReply({ embeds: [sassyReply], files: [sassyFile], ephemeral: true });
                    }
                    break;

                case 'kaamelott-clear': 
                    if(interaction.options.getBoolean('audio')) {
                        await askToClearCache(interaction, "sounds");
                        break;
                    }
                    if(interaction.options.getBoolean('gifs')) {
                        await askToClearCache(interaction, "gifs");
                        break;
                    }
                    await interaction.reply({ embeds: [sassyReply], files: [sassyFile], ephemeral: true });
                    break;
            }

            return;
        }

        // The user clicked on a button
        if (interaction.isButton()) {
            if(interaction.customId == 'stopCurrentSound') {
                kaamelottAudio.stopAudio(player);
                await interaction.reply({ content: 'Zuuuuuuuut !', ephemeral: true });
            } else if(interaction.customId.startsWith('replayAudio_')) {
                await interaction.reply({ content: 'Swing it baby !', ephemeral: true });

                const tempFilePath = interaction.customId.substring('replayAudio_'.length);
                const filename = fs.readFileSync(tempFilePath, 'utf8'); // Use the content of the temp file as the filename
                logger.debug("Replaying file " + filename);
                await interaction.editReply({ content: 'Replaying file ' + filename });
                await kaamelottAudio.playAudio(interaction.member?.voice.channel, player, getCacheFilePath(filename, "sounds"));
                await interaction.editReply({ content: 'Done' });
            } else if(interaction.customId == 'clearsoundsCache') {
                clearCache(interaction, "sounds", ".mp3");
            } else if(interaction.customId == 'cleargifsCache') {
                clearCache(interaction, "gifs", ".gif");
            }
            return;
        }
    });
    
    client.login(token);
}

function getCacheFilePath(filename: string, type: string) {
    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../"+type+"/";
    const filepath = cacheDirectory + filename;
    return filepath;
}

// Show a warning and ask for a confirmation
// The user can accept by clicking on the button
async function askToClearCache(interaction: typeof Interaction, type: string) {    
    if(!isAdmin(interaction.member)) {
        await interaction.reply({ content: "You're not an admin !", ephemeral: true });
        return;
    }

    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("This will delete all the " + type + " in cache. Are you sure ?");

    const rowButtons = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
            .setCustomId("clear" + type + "Cache")
            .setLabel("Yes, I'm sure !")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("⚠️")
        );

    await interaction.reply({ embeds: [reply], components: [rowButtons], ephemeral: true });
}
// Clear local cached files
// Sounds and Gifs, according to the type
async function clearCache(interaction: typeof Interaction, type: string, fileExt: string) {
    await interaction.reply({ content: "Essayons de nettoyer ce merdier", ephemeral: true });

    if(!isAdmin(interaction.member)) {
        await interaction.editReply({ content: "You're not an admin !" });
        return;
    }

    logger.debug("Clearing " + type + " cache");
    let cacheDirectory = getCacheFilePath("", type);
    let nbDeletedFiles = 0;
    let nbSkippedFiles = 0;
    const files = fs.readdirSync(cacheDirectory);
        
    for (const file of files) {
        if(!file.endsWith(fileExt)) {
            nbSkippedFiles++;
            continue;
        }
        
        try {
            fs.unlinkSync(path.join(cacheDirectory, file));
            nbDeletedFiles++;
        } catch(err) {
            logger.error("Error while deleting file " + file + " : ", err);
        }
    }
    await interaction.editReply({ content: "Cache cleared. " + nbDeletedFiles + " files deleted, " + nbSkippedFiles + " files skipped." });
}

function isAdmin(member: typeof Member) {
    if(member == null || member.roles == null || member.roles.cache == null) {
        logger.warn("Roles are null ! Member : ", member);
        return false;
    }

    return member.roles.cache.some(role => role.name === 'Admin');
}

startBot();
