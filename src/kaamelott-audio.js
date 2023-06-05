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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopAudio = exports.playAudio = exports.searchAndReplyAudio = void 0;
var path = require("path");
var fs = require("fs");
var superagent = require("superagent");
var discord_js_1 = require("discord.js");
var logger_1 = require("../conf/logger");
var config_1 = require("../conf/config");
var utils = require("./utils");
var _a = require("@discordjs/voice"), StreamType = _a.StreamType, createAudioResource = _a.createAudioResource, entersState = _a.entersState, AudioPlayerStatus = _a.AudioPlayerStatus, VoiceConnectionStatus = _a.VoiceConnectionStatus, joinVoiceChannel = _a.joinVoiceChannel;
var isBotPlayingSound = false;
function searchAndReplyAudio(interaction, sounds, player, cacheDirectory) {
    return __awaiter(this, void 0, void 0, function () {
        var silent, options, index, results, warning, allIndex, subValue_1, optionMapping_1, individualResults_1, firstArray, remainingArrays, _i, _a, _b, key, value;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    logger_1.logger.debug("YOU RAAAAANG ???");
                    return [4, interaction.reply({ content: "Jamais de bougie dans une librairie !!!" })];
                case 1:
                    _c.sent();
                    silent = false;
                    options = __spreadArray([], interaction.options.data, true);
                    logger_1.logger.debug('options : ', options);
                    index = options.findIndex(function (opt) { return opt.name == "silencieux"; });
                    if (index != -1) {
                        silent = options[index].value;
                        options.splice(index, 1);
                    }
                    if (options.length == 0) {
                        replyWithMediaAudio(interaction, player, sounds[utils.getRandomInt(sounds.length - 1)], silent, cacheDirectory);
                        return [2];
                    }
                    results = [];
                    warning = "";
                    allIndex = options.findIndex(function (opt) { return opt.name == "tout"; });
                    if (allIndex != -1) {
                        subValue_1 = options[allIndex].value.toLowerCase();
                        if (options.length > 1) {
                            warning = warning + "J'ai ignoré les autres options car tu as demandé Tout.\n";
                            options = [options[allIndex]];
                        }
                        sounds.forEach(function (sound) {
                            if (sound.character.toLowerCase().includes(subValue_1) ||
                                sound.episode.toLowerCase().includes(subValue_1) ||
                                sound.title.toLowerCase().includes(subValue_1)) {
                                results.push(sound);
                            }
                        });
                    }
                    else {
                        optionMapping_1 = {
                            "perso": "character",
                            "titre": "episode",
                            "texte": "title"
                        };
                        individualResults_1 = {};
                        options.forEach(function (option) {
                            var optName = optionMapping_1[option.name];
                            individualResults_1[optName] = [];
                            sounds.forEach(function (sound) {
                                if (sound[optName].toLowerCase().includes(option.value.toLowerCase())) {
                                    individualResults_1[optName].push(sound);
                                }
                            });
                        });
                        firstArray = null;
                        remainingArrays = [];
                        for (_i = 0, _a = Object.entries(individualResults_1); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            if (firstArray == null) {
                                firstArray = value;
                            }
                            else {
                                remainingArrays.push(value);
                            }
                        }
                        ;
                        results = utils.findArraysIntersection(firstArray, remainingArrays);
                    }
                    if (results.length == 0) {
                        warning = warning + "Aucun résultat, j'en file un au hasard\n";
                        replyWithMediaAudio(interaction, player, sounds[utils.getRandomInt(sounds.length)], silent, cacheDirectory, warning, options);
                        return [2];
                    }
                    if (results.length > 1) {
                        warning = warning + "1 résultat parmi " + results.length + "\n";
                    }
                    replyWithMediaAudio(interaction, player, results[utils.getRandomInt(results.length)], silent, cacheDirectory, warning, options);
                    return [2];
            }
        });
    });
}
exports.searchAndReplyAudio = searchAndReplyAudio;
function replyWithMediaAudio(interaction, player, sound, silent, cacheDirectory, warning, options) {
    var _a, _b;
    if (silent === void 0) { silent = false; }
    if (warning === void 0) { warning = ""; }
    if (options === void 0) { options = null; }
    return __awaiter(this, void 0, void 0, function () {
        var filename, fullUrl, filepath, response, error_1, reply, optionsInline, tmpFilePath, rowButtons;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isBotPlayingSound) return [3, 2];
                    return [4, interaction.editReply("Molo fiston, j'ai pas fini la dernière commande !")];
                case 1:
                    _c.sent();
                    return [2];
                case 2:
                    interaction.member = interaction.member;
                    if (!!((_a = interaction.member) === null || _a === void 0 ? void 0 : _a.voice.channel)) return [3, 4];
                    return [4, interaction.editReply("T'es pas dans un chan audio, gros ! (Ou alors t'as pas les droits)")];
                case 3:
                    _c.sent();
                    return [2];
                case 4:
                    if (!(sound == null || sound.file == null)) return [3, 6];
                    logger_1.logger.error("Sound is null or file is null, it should not happen. sound : ", sound);
                    return [4, interaction.editReply("Une erreur survenue est inattandue !")];
                case 5:
                    _c.sent();
                    return [2];
                case 6:
                    filename = sound.file;
                    fullUrl = config_1.audioBaseUrl + filename;
                    filepath = path.join(cacheDirectory, filename);
                    _c.label = 7;
                case 7:
                    _c.trys.push([7, 10, , 11]);
                    if (!!fs.existsSync(filepath)) return [3, 9];
                    logger_1.logger.debug("Cached file does not exist, downloading it from " + fullUrl);
                    return [4, superagent.get(fullUrl)];
                case 8:
                    response = _c.sent();
                    fs.writeFileSync(filepath, response.body);
                    _c.label = 9;
                case 9: return [3, 11];
                case 10:
                    error_1 = _c.sent();
                    logger_1.logger.warn("Error while trying to cache file at " + filepath + " : ", error_1);
                    return [3, 11];
                case 11:
                    logger_1.logger.debug("Sending embed to user. Warning : " + warning + ", options : ", options);
                    reply = new discord_js_1.EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle((sound.file).substring(0, 255))
                        .setURL(fullUrl)
                        .setAuthor({ name: 'by Pumbaa', iconURL: 'https://avatars.githubusercontent.com/u/34394718?v=4', url: 'https://github.com/pumbaa666' })
                        .setDescription(sound.title)
                        .addFields({ name: 'Episode', value: sound.episode, inline: true }, { name: 'Personnages', value: sound.character, inline: true })
                        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icons/icon-32x32.png' });
                    if (options != null) {
                        optionsInline = options.map(function (option) { return option.value; }).join(", ").toLowerCase() + " (in " + options.map(function (option) { return option.name; }).join(", ").toLowerCase() + ")";
                        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false });
                    }
                    if (warning != "") {
                        reply.addFields({ name: 'Warning', value: warning, inline: false });
                    }
                    tmpFilePath = '/tmp/kb-replay_' + "".concat(Math.random().toString(36).substring(2, 16));
                    fs.writeFileSync(tmpFilePath, filename);
                    rowButtons = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('replayAudio_' + tmpFilePath)
                        .setStyle(discord_js_1.ButtonStyle.Success)
                        .setEmoji('🔄'))
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('stopCurrentSound')
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setEmoji('🔇'));
                    return [4, interaction.editReply({ embeds: [reply], components: [rowButtons] })];
                case 12:
                    _c.sent();
                    if (silent) {
                        logger_1.logger.debug("Silent mode, not playing audio");
                        return [2];
                    }
                    return [4, playAudio((_b = interaction.member) === null || _b === void 0 ? void 0 : _b.voice.channel, player, filepath)];
                case 13:
                    _c.sent();
                    return [2];
            }
        });
    });
}
function connectToVoiceChannel(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var connection, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, entersState(connection, VoiceConnectionStatus.Ready, 2000)];
                case 2:
                    _a.sent();
                    return [2, connection];
                case 3:
                    error_2 = _a.sent();
                    connection.destroy();
                    throw error_2;
                case 4: return [2];
            }
        });
    });
}
function playAudio(channel, player, filepath) {
    return __awaiter(this, void 0, void 0, function () {
        var resource, voiceChannel, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isBotPlayingSound) {
                        return [2];
                    }
                    if (channel == null) {
                        logger_1.logger.warn("Channel is null, can't play audio");
                        return [2];
                    }
                    isBotPlayingSound = true;
                    resource = createAudioResource(filepath, {
                        inputType: StreamType.Arbitrary,
                    });
                    voiceChannel = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, connectToVoiceChannel(channel)];
                case 2:
                    voiceChannel = _a.sent();
                    return [3, 4];
                case 3:
                    error_3 = _a.sent();
                    isBotPlayingSound = false;
                    logger_1.logger.warn("Error trying to connect to channel : ", error_3);
                    return [2];
                case 4:
                    logger_1.logger.debug("connected to voice channel : " + channel.name);
                    try {
                        voiceChannel.subscribe(player);
                        player.play(resource);
                        player.on("stateChange", function (state) {
                            logger_1.logger.debug("State changed to " + state.status);
                            if (state.status == AudioPlayerStatus.Playing) {
                                isBotPlayingSound = false;
                                logger_1.logger.debug("Longue vie à Kaamelott !");
                            }
                        });
                    }
                    catch (error) {
                        logger_1.logger.error("Error while playing audio at " + filepath + " : ", error);
                        logger_1.logger.error(" - Player : ", player);
                        logger_1.logger.error(" - VoiceChannel : ", voiceChannel);
                        logger_1.logger.error(" - Resource : ", resource);
                    }
                    return [2, entersState(player, AudioPlayerStatus.Playing, 5000)];
            }
        });
    });
}
exports.playAudio = playAudio;
function stopAudio(player) {
    logger_1.logger.debug("Stopping current sound");
    isBotPlayingSound = false;
    try {
        player.stop();
    }
    catch (error) {
        logger_1.logger.error("Error while trying to stop current sound : ", error);
    }
}
exports.stopAudio = stopAudio;
