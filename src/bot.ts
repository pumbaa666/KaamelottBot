// https://discord.com/developers/docs/interactions/application-commands
// Basic Bot (mon usage) https://github.com/discordjs/voice-examples/blob/main/basic/src/adapter.ts
// Radio Bot : https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts

// TODO `systemctl status kaamelott_bot` montre les logs depuis trop longtemps, il faut les remettre à 0
// TODO intégrer les pull request en attente : https://github.com/2ec0b4/kaamelott-soundboard/pulls
// TODO proposer les ajouts de crystal en PR
// TODO détecter la connection du bot discord à l'API et afficher un message dans les logs

import * as path from 'path';
import * as fs from 'fs';
import * as superagent from "superagent";

import { REST, Routes, Client } from "discord.js";
import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Interaction, Role, GuildMember, VoiceChannel } from "discord.js";
import { createAudioPlayer, AudioPlayer } from "@discordjs/voice";
import type { CommandInteraction, ButtonInteraction } from "discord.js";

import *  as kaamelottAudio from "./kaamelott-audio";
import *  as kaamelottGifs from "./kaamelott-gifs";
import { audioBaseUrl, gifsBaseUrl } from "../conf/config";
const { client_id, token } = require('../conf/auth-prod.json');

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

let isBotRefreshing = false;

export type Sound = {
    character: string;
    episode: string;
    file: string;
    title: string;
};

export type Gif = {
    quote: string, // title / text
    characters: string[];
    characters_speaking: string[];
    filename: string;
};

enum MEDIA_TYPE {
    sounds = "sounds",
    gifs = "gifs"
}

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

    const player: AudioPlayer = createAudioPlayer();
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
        {
            name: 'kaamelott-version',
            description: 'Show the bot version',
            default_member_permissions: GUILD_TEXT,
            type: CHAT_INPUT
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
    const result = await parseJson(url, MEDIA_TYPE.gifs);
    if(result != null) {
        gifs = result;
    }
}

async function parseAudioJson(url: string) {
    const result = await parseJson(url, MEDIA_TYPE.sounds);
    if(result != null) {    
        sounds = result;
    }
}

// Parse a JSON file from a URL and return an array of objects (Sounds or Gifs)
async function parseJson(url: string, type: MEDIA_TYPE) {
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
async function refreshList(interaction: CommandInteraction, type: MEDIA_TYPE, url: string, oldCount: number) {
    // Check if the user is an admin
    if(!isAdmin(interaction.member as GuildMember)) {
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
function startClient(player: AudioPlayer) {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });

    client.on("ready", () => {
        logger.info("KaamelottBot is live ! C'est quoi que t'as pas compris ?");
    });
    
    client.on("interactionCreate", async (interaction: Interaction) => {
        // The user sent a slash command
        if (interaction.isChatInputCommand()) {
            const commandInteraction = interaction as CommandInteraction;
            
            const author: GuildMember = interaction.member as GuildMember;
            const authorName: string = author.displayName;
    
            const filename = "allez-crever.gif";
            const sassyFile = new AttachmentBuilder("./resources/gifs/"+filename);
            sassyFile.setName(filename);
            const sassyReply = new EmbedBuilder()
                .setTitle("Ah putain, ouais en fait vous m'avez fait lever pour rien ! 😡")
                .setDescription("Je vous le dis, je vais vous faire descendre en cabane avec un pichet de flotte un bout de pain sec. Je suis désolé, je suis démuni, je vois pas d'autre solution.")
                .setImage("attachment://"+filename)
                .setFooter({ text: 'Puis je pense que ça vous donnera un peu l\'occasion de réfléchir un peu à tout ça tête reposée. Prendre un peu de recul sur les choses parce que, '+authorName+', on ne réveille pas son bot en pleine nuit pour des conneries, encore moins deux fois de suite.' })
                
            switch(commandInteraction.commandName) {
                case 'ping': await commandInteraction.reply('Pong!'); break;
                case 'kaamelott-audio': await kaamelottAudio.searchAndReplyAudio(commandInteraction, sounds, player, getCacheFilePath("", MEDIA_TYPE.sounds)); break;
                case 'kaamelott-gifs': await kaamelottGifs.searchAndReplyGif(commandInteraction, gifs, getCacheFilePath("", MEDIA_TYPE.gifs)); break;
                case 'kaamelott-refresh':
                    if(isBotRefreshing) {
                        await commandInteraction.reply({ content: "Oula, tout doux mon grand, j'suis en plein refresh. Va te chercher un Pastis.", ephemeral: true });
                        return;
                    }
                    await commandInteraction.reply({ content: "En cours de refresh...", ephemeral: true });
                    isBotRefreshing = true;
                    if(interaction.options.getBoolean('audio')) {
                        await refreshList(commandInteraction, MEDIA_TYPE.sounds, audioBaseUrl, sounds.length);
                    }
                    if(interaction.options.getBoolean('gifs')) {
                        await refreshList(commandInteraction, MEDIA_TYPE.gifs, gifsBaseUrl, gifs.length);
                    }
                    if(!interaction.options.getBoolean('gifs') && !interaction.options.getBoolean('audio')) {
                        await commandInteraction.editReply({ embeds: [sassyReply], files: [sassyFile] });
                    }
                    isBotRefreshing = false;
                    break;

                case 'kaamelott-clear': 
                    // Only one at a time, because we ask for confirmation
                    if(interaction.options.getBoolean('audio')) {
                        await askToClearCache(commandInteraction, MEDIA_TYPE.sounds);
                        break;
                    }
                    if(interaction.options.getBoolean('gifs')) {
                        await askToClearCache(commandInteraction, MEDIA_TYPE.gifs);
                        break;
                    }
                    await commandInteraction.reply({ embeds: [sassyReply], files: [sassyFile] });
                    break;
                
                case 'kaamelott-version':
                    const versionReply = new EmbedBuilder()
                        // Get version from conf/auth-prod.json
                        const version = require('../conf/auth-prod.json').botVersion;
                        
                        const reply = new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTitle("Version")
                            .setAuthor({ name: 'by Pumbaa', iconURL: 'https://avatars.githubusercontent.com/u/34394718?v=4', url: 'https://github.com/pumbaa666' })
                            .setDescription(version)
                            .setFooter({ text: "Vous avez une idée du temps qu'il me faut pour tracer une lettre avec ces PUTAINS DE PLUMES ?!" });
                    await commandInteraction.reply({ embeds: [reply] });
                    break;
            }

            return;
        }

        // The user clicked on a button
        if (interaction.isButton()) {
            const buttonInteraction = interaction as ButtonInteraction
            if(buttonInteraction.customId == 'stopCurrentSound') {
                kaamelottAudio.stopAudio(player);
                await buttonInteraction.reply({ content: 'Zuuuuuuuut !', ephemeral: true });
            } else if(buttonInteraction.customId.startsWith('replayAudio_')) {
                await buttonInteraction.reply({ content: 'Swing it baby !', ephemeral: true });

                const tempFilePath = buttonInteraction.customId.substring('replayAudio_'.length);
                const filename = fs.readFileSync(tempFilePath, 'utf8'); // Use the content of the temp file as the filename
                logger.debug("Replaying file " + filename);
                await buttonInteraction.editReply({ content: 'Replaying file ' + filename });
                await kaamelottAudio.playAudio(buttonInteraction, player, getCacheFilePath(filename, MEDIA_TYPE.sounds));
            } else if(buttonInteraction.customId == 'clearsoundsCache') {
                clearCache(interaction, MEDIA_TYPE.sounds, ".mp3");
            } else if(buttonInteraction.customId == 'cleargifsCache') {
                clearCache(interaction, MEDIA_TYPE.gifs, ".gif");
            }
            return;
        }
    });
    
    client.login(token);
}

function getCacheFilePath(filename: string, type: MEDIA_TYPE) {
    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../../"+type+"/"; // One level up more since the js code is in bin/, now
    const filepath = cacheDirectory + filename;
    return filepath;
}

// Show a warning and ask for a confirmation
// The user can accept by clicking on the button
async function askToClearCache(interaction: CommandInteraction, type: MEDIA_TYPE) {
    if(!isAdmin(interaction.member as GuildMember)) {
        await interaction.reply({ content: "You're not an admin !", ephemeral: true });
        return;
    }

    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("This will delete all the " + type + " in cache. Are you sure ?");

    const rowButtons = new ActionRowBuilder<ButtonBuilder>()
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
async function clearCache(interaction: ButtonInteraction, type: MEDIA_TYPE, fileExt: string) {
    await interaction.reply({ content: "Essayons de nettoyer ce merdier", ephemeral: true });
    if(!isAdmin(interaction.member as GuildMember)) {
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

function isAdmin(member: GuildMember) {
    if(member == null || member.roles == null || member.roles.cache == null) {
        logger.warn("Roles are null ! Member : ", member);
        return false;
    }

    return member.roles.cache.some(role => role.name === 'Admin');
}

startBot();
