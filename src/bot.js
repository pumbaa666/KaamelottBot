"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var superagent = require("superagent");
var discord_js_1 = require("discord.js");
var discord_js_2 = require("discord.js");
var voice_1 = require("@discordjs/voice");
var kaamelottAudio = require("./kaamelott-audio");
var kaamelottGifs = require("./kaamelott-gifs");
var config_1 = require("../conf/config");
var _a = require('../conf/auth-prod.json'), client_id = _a.client_id, token = _a.token;
var logger_1 = require("../conf/logger");
logger_1.logger.level = 'debug';
var GatewayIntentBits = require("discord-api-types/v10").GatewayIntentBits;
var CHAT_INPUT = 1;
var GUILD_TEXT = 0;
var GUILD_VOICE = 2;
var STRING = 3;
var BOOLEAN = 5;
var ADMINISTRATOR = 8;
var sounds = null;
var gifs = null;
var isBotRefreshing = false;
var isBotClearing = false;
function startBot() {
    return __awaiter(this, void 0, void 0, function () {
        var slashCommandsResult, player, tomorrow;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, registerSlashCommands()];
                case 1:
                    slashCommandsResult = _a.sent();
                    if (slashCommandsResult == false) {
                        logger_1.logger.error("Error registering Slash Commands, aborting");
                        return [2];
                    }
                    return [4, parseAudioJson(config_1.audioBaseUrl)];
                case 2:
                    _a.sent();
                    if (sounds == null) {
                        logger_1.logger.error("Error parsing sounds (see above), aborting");
                        return [2];
                    }
                    return [4, parseGifsJson(config_1.gifsBaseUrl)];
                case 3:
                    _a.sent();
                    if (gifs == null) {
                        logger_1.logger.error("Error parsing gifs (see above), aborting");
                        return [2];
                    }
                    player = (0, voice_1.createAudioPlayer)();
                    if (player == null) {
                        logger_1.logger.error("Error creating audio player, aborting");
                        return [2];
                    }
                    try {
                        startClient(player);
                    }
                    catch (error) {
                        logger_1.logger.error("Error starting client : ", error);
                        return [2];
                    }
                    tomorrow = 24 * 60 * 60 * 1000;
                    logger_1.logger.info("Refreshing sounds and gifs list every 24 hours. Next refresh at " + new Date(Date.now() + tomorrow).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }));
                    setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4, parseAudioJson(config_1.audioBaseUrl)];
                                case 1:
                                    _a.sent();
                                    return [4, parseGifsJson(config_1.gifsBaseUrl)];
                                case 2:
                                    _a.sent();
                                    return [2];
                            }
                        });
                    }); }, tomorrow);
                    return [2];
            }
        });
    });
}
function registerSlashCommands() {
    return __awaiter(this, void 0, void 0, function () {
        var commands, rest, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    commands = [
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
                    rest = new discord_js_1.REST({ version: '10' }).setToken(token);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    logger_1.logger.debug("Started refreshing application (/) commands : " + (commands.map(function (command) { return command.name; })));
                    return [4, rest.put(discord_js_1.Routes.applicationCommands(client_id), { body: commands })];
                case 2:
                    _a.sent();
                    logger_1.logger.info("Successfully reloaded application (/) commands.");
                    return [2, true];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error("Error while refreshing application (/) commands : ", error_1);
                    return [3, 4];
                case 4: return [2, false];
            }
        });
    });
}
function parseGifsJson(url) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, parseJson(url, "gifs")];
                case 1:
                    result = _a.sent();
                    if (result != null) {
                        gifs = result;
                    }
                    return [2];
            }
        });
    });
}
function parseAudioJson(url) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, parseJson(url, "sounds")];
                case 1:
                    result = _a.sent();
                    if (result != null) {
                        sounds = result;
                    }
                    return [2];
            }
        });
    });
}
function parseJson(url, type) {
    return __awaiter(this, void 0, void 0, function () {
        var fullUrl, response, error_2, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fullUrl = url + type + ".json";
                    response = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, superagent.get(fullUrl)];
                case 2:
                    response = _a.sent();
                    return [3, 4];
                case 3:
                    error_2 = _a.sent();
                    logger_1.logger.error("Error while fetching " + type + " at " + fullUrl, error_2);
                    return [2, null];
                case 4:
                    if (response.body && Array.isArray(response.body)) {
                        logger_1.logger.info(type + " parsed successfully : " + response.body.length + " found.");
                        return [2, response.body];
                    }
                    if (response.text != null && response.text != "") {
                        list = JSON.parse(response.text);
                        if (list && Array.isArray(list)) {
                            logger_1.logger.info(type + " parsed successfully : " + list.length + " found.");
                            return [2, list];
                        }
                    }
                    logger_1.logger.error("There are no " + type + " array at " + fullUrl);
                    return [2, null];
            }
        });
    });
}
function refreshList(interaction, type, url, oldCount) {
    return __awaiter(this, void 0, void 0, function () {
        var refreshed, newCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    interaction.member = interaction.member;
                    if (!!isAdmin(interaction.member)) return [3, 2];
                    return [4, interaction.editReply({ content: "You're not an admin !" })];
                case 1:
                    _a.sent();
                    return [2, null];
                case 2:
                    logger_1.logger.info("Refreshing " + type + " list...");
                    return [4, parseJson(url, type)];
                case 3:
                    refreshed = _a.sent();
                    if (!(refreshed == null)) return [3, 5];
                    logger_1.logger.error("Error refreshing " + type + " list, fallback to previous list");
                    return [4, interaction.editReply({ content: "Error refreshing " + type + " list, fallback to previous list" })];
                case 4:
                    _a.sent();
                    return [2, null];
                case 5:
                    newCount = refreshed.length;
                    return [4, interaction.editReply({ content: "Succès ! " + (newCount - oldCount) + " " + type + " ajoutés. Total : " + newCount })];
                case 6:
                    _a.sent();
                    return [2, refreshed];
            }
        });
    });
}
function startClient(player) {
    var _this = this;
    var client = new discord_js_1.Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });
    client.on("ready", function () {
        logger_1.logger.info("KaamelottBot is live ! C'est quoi que t'as pas compris ?");
    });
    client.on("interactionCreate", function (interaction) { return __awaiter(_this, void 0, void 0, function () {
        var commandInteraction, filename, sassyFile, sassyReply, _a, buttonInteraction, tempFilePath, filename;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (interaction == null || !interaction.isCommand()) {
                        return [2];
                    }
                    if (!interaction.isChatInputCommand()) return [3, 28];
                    commandInteraction = interaction;
                    filename = "eye-on-you.gif";
                    sassyFile = new discord_js_2.AttachmentBuilder("./resources/" + filename);
                    sassyFile.setName(filename);
                    sassyReply = new discord_js_2.EmbedBuilder()
                        .setTitle("Merci de m'appeler pour rien !! 😡")
                        .setDescription("Tu vois ce que tu me fais coder ???")
                        .setImage("attachment://" + filename)
                        .setFooter({ text: 'Je te crache au visage, tient ! Pteuh !' });
                    _a = commandInteraction.commandName;
                    switch (_a) {
                        case 'ping': return [3, 1];
                        case 'kaamelott-audio': return [3, 3];
                        case 'kaamelott-gifs': return [3, 5];
                        case 'kaamelott-refresh': return [3, 7];
                        case 'kaamelott-clear': return [3, 17];
                    }
                    return [3, 27];
                case 1: return [4, commandInteraction.reply('Pong!')];
                case 2:
                    _c.sent();
                    return [3, 27];
                case 3: return [4, kaamelottAudio.searchAndReplyAudio(commandInteraction, sounds, player, getCacheFilePath("", "sounds"))];
                case 4:
                    _c.sent();
                    return [3, 27];
                case 5: return [4, kaamelottGifs.searchAndReplyGif(commandInteraction, gifs, getCacheFilePath("", "gifs"))];
                case 6:
                    _c.sent();
                    return [3, 27];
                case 7:
                    if (!isBotRefreshing) return [3, 9];
                    return [4, commandInteraction.reply({ content: "Oula, tout doux mon grand, j'suis en plein refresh. Va te chercher un Pastis.", ephemeral: true })];
                case 8:
                    _c.sent();
                    return [2];
                case 9: return [4, commandInteraction.reply({ content: "En cours de refresh...", ephemeral: true })];
                case 10:
                    _c.sent();
                    isBotRefreshing = true;
                    if (!interaction.options.getBoolean('audio')) return [3, 12];
                    return [4, refreshList(commandInteraction, "sounds", config_1.audioBaseUrl, sounds.length)];
                case 11:
                    _c.sent();
                    _c.label = 12;
                case 12:
                    if (!interaction.options.getBoolean('gifs')) return [3, 14];
                    return [4, refreshList(commandInteraction, "gifs", config_1.gifsBaseUrl, gifs.length)];
                case 13:
                    _c.sent();
                    _c.label = 14;
                case 14:
                    if (!(!interaction.options.getBoolean('gifs') && !interaction.options.getBoolean('audio'))) return [3, 16];
                    return [4, commandInteraction.editReply({ embeds: [sassyReply], files: [sassyFile] })];
                case 15:
                    _c.sent();
                    _c.label = 16;
                case 16:
                    isBotRefreshing = false;
                    return [3, 27];
                case 17:
                    if (!isBotClearing) return [3, 19];
                    return [4, commandInteraction.reply({ content: "J'ai pas fini de nettoyer ! Et barrez-vous avec vos godasses sales !", ephemeral: true })];
                case 18:
                    _c.sent();
                    return [2];
                case 19: return [4, commandInteraction.reply({ content: "En cours de nettoyage...", ephemeral: true })];
                case 20:
                    _c.sent();
                    isBotClearing = true;
                    if (!interaction.options.getBoolean('audio')) return [3, 22];
                    return [4, askToClearCache(commandInteraction, "sounds")];
                case 21:
                    _c.sent();
                    _c.label = 22;
                case 22:
                    if (!interaction.options.getBoolean('gifs')) return [3, 24];
                    return [4, askToClearCache(commandInteraction, "gifs")];
                case 23:
                    _c.sent();
                    _c.label = 24;
                case 24:
                    if (!(!interaction.options.getBoolean('gifs') && !interaction.options.getBoolean('audio'))) return [3, 26];
                    return [4, commandInteraction.editReply({ embeds: [sassyReply], files: [sassyFile] })];
                case 25:
                    _c.sent();
                    _c.label = 26;
                case 26:
                    isBotClearing = false;
                    return [3, 27];
                case 27: return [2];
                case 28:
                    if (!interaction.isButton()) return [3, 37];
                    buttonInteraction = interaction;
                    buttonInteraction.member = buttonInteraction.member;
                    if (!(buttonInteraction.customId == 'stopCurrentSound')) return [3, 30];
                    kaamelottAudio.stopAudio(player);
                    return [4, buttonInteraction.reply({ content: 'Zuuuuuuuut !', ephemeral: true })];
                case 29:
                    _c.sent();
                    return [3, 36];
                case 30:
                    if (!buttonInteraction.customId.startsWith('replayAudio_')) return [3, 35];
                    return [4, buttonInteraction.reply({ content: 'Swing it baby !', ephemeral: true })];
                case 31:
                    _c.sent();
                    tempFilePath = buttonInteraction.customId.substring('replayAudio_'.length);
                    filename = fs.readFileSync(tempFilePath, 'utf8');
                    logger_1.logger.debug("Replaying file " + filename);
                    return [4, buttonInteraction.editReply({ content: 'Replaying file ' + filename })];
                case 32:
                    _c.sent();
                    return [4, kaamelottAudio.playAudio((_b = buttonInteraction.member) === null || _b === void 0 ? void 0 : _b.voice.channel, player, getCacheFilePath(filename, "sounds"))];
                case 33:
                    _c.sent();
                    return [4, buttonInteraction.editReply({ content: 'Done' })];
                case 34:
                    _c.sent();
                    return [3, 36];
                case 35:
                    if (buttonInteraction.customId == 'clearsoundsCache') {
                        clearCache(interaction, "sounds", ".mp3");
                    }
                    else if (buttonInteraction.customId == 'cleargifsCache') {
                        clearCache(interaction, "gifs", ".gif");
                    }
                    _c.label = 36;
                case 36: return [2];
                case 37: return [2];
            }
        });
    }); });
    client.login(token);
}
function getCacheFilePath(filename, type) {
    var currentFilePath = path.resolve(__dirname);
    var cacheDirectory = currentFilePath + "/../" + type + "/";
    var filepath = cacheDirectory + filename;
    return filepath;
}
function askToClearCache(interaction, type) {
    return __awaiter(this, void 0, void 0, function () {
        var reply, rowButtons;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    interaction.member = interaction.member;
                    if (!!isAdmin(interaction.member)) return [3, 2];
                    return [4, interaction.reply({ content: "You're not an admin !", ephemeral: true })];
                case 1:
                    _a.sent();
                    return [2];
                case 2:
                    reply = new discord_js_2.EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle("This will delete all the " + type + " in cache. Are you sure ?");
                    rowButtons = new discord_js_2.ActionRowBuilder()
                        .addComponents(new discord_js_2.ButtonBuilder()
                        .setCustomId("clear" + type + "Cache")
                        .setLabel("Yes, I'm sure !")
                        .setStyle(discord_js_2.ButtonStyle.Danger)
                        .setEmoji("⚠️"));
                    return [4, interaction.reply({ embeds: [reply], components: [rowButtons], ephemeral: true })];
                case 3:
                    _a.sent();
                    return [2];
            }
        });
    });
}
function clearCache(interaction, type, fileExt) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheDirectory, nbDeletedFiles, nbSkippedFiles, files, _i, files_1, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, interaction.reply({ content: "Essayons de nettoyer ce merdier", ephemeral: true })];
                case 1:
                    _a.sent();
                    interaction.member = interaction.member;
                    if (!!isAdmin(interaction.member)) return [3, 3];
                    return [4, interaction.editReply({ content: "You're not an admin !" })];
                case 2:
                    _a.sent();
                    return [2];
                case 3:
                    logger_1.logger.debug("Clearing " + type + " cache");
                    cacheDirectory = getCacheFilePath("", type);
                    nbDeletedFiles = 0;
                    nbSkippedFiles = 0;
                    files = fs.readdirSync(cacheDirectory);
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        file = files_1[_i];
                        if (!file.endsWith(fileExt)) {
                            nbSkippedFiles++;
                            continue;
                        }
                        try {
                            fs.unlinkSync(path.join(cacheDirectory, file));
                            nbDeletedFiles++;
                        }
                        catch (err) {
                            logger_1.logger.error("Error while deleting file " + file + " : ", err);
                        }
                    }
                    return [4, interaction.editReply({ content: "Cache cleared. " + nbDeletedFiles + " files deleted, " + nbSkippedFiles + " files skipped." })];
                case 4:
                    _a.sent();
                    return [2];
            }
        });
    });
}
function isAdmin(member) {
    if (member == null || member.roles == null || member.roles.cache == null) {
        logger_1.logger.warn("Roles are null ! Member : ", member);
        return false;
    }
    return member.roles.cache.some(function (role) { return role.name === 'Admin'; });
}
startBot();
