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
exports.searchAndReplyGif = void 0;
var path = require("path");
var fs = require("fs");
var superagent = require("superagent");
var discord_js_1 = require("discord.js");
var logger_1 = require("../conf/logger");
var config_1 = require("../conf/config");
var utils = require("./utils");
function searchAndReplyGif(interaction, gifs, cacheDirectory) {
    return __awaiter(this, void 0, void 0, function () {
        var options, results, warning, allIndex, subValue_1, optionMapping_1, individualResults_1, firstArray, remainingArrays, _i, _a, _b, key, value;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4, interaction.reply({ content: "Jamais de bougie dans une librairie !!!" })];
                case 1:
                    _c.sent();
                    logger_1.logger.debug("Allo?");
                    options = __spreadArray([], interaction.options.data, true);
                    logger_1.logger.info('Searching gifs with : ' + options.map(function (opt) { return opt.name + ":" + opt.value; }).join(", "));
                    if (options.length == 0) {
                        replyWithMediaGif(interaction, gifs[utils.getRandomInt(gifs.length - 1)], cacheDirectory);
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
                        gifs.forEach(function (gif) {
                            var characters = Array.isArray(gif.characters) ? gif.characters.join(",") : gif.characters;
                            var charactersSpeaking = Array.isArray(gif.characters_speaking) ? gif.characters_speaking.join(",") : gif.characters_speaking;
                            if (characters.toLowerCase().includes(subValue_1) ||
                                charactersSpeaking.toLowerCase().includes(subValue_1) ||
                                gif.quote.toLowerCase().includes(subValue_1)) {
                                results.push(gif);
                            }
                        });
                    }
                    else {
                        optionMapping_1 = {
                            "perso": "characters",
                            "texte": "quote"
                        };
                        individualResults_1 = {};
                        options.forEach(function (option) {
                            var optName = optionMapping_1[option.name];
                            individualResults_1[optName] = [];
                            gifs.forEach(function (gif) {
                                var optionsInline = Array.isArray(gif[optName]) ? gif[optName].join(",") : gif[optName];
                                if (optionsInline.toLowerCase().includes(option.value.toLowerCase())) {
                                    individualResults_1[optName].push(gif);
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
                        replyWithMediaGif(interaction, gifs[utils.getRandomInt(gifs.length)], cacheDirectory, warning, options);
                        return [2];
                    }
                    if (results.length > 1) {
                        warning = warning + "1 résultat parmi " + results.length + "\n";
                    }
                    replyWithMediaGif(interaction, results[utils.getRandomInt(results.length)], cacheDirectory, warning, options);
                    return [2];
            }
        });
    });
}
exports.searchAndReplyGif = searchAndReplyGif;
function replyWithMediaGif(interaction, gif, cacheDirectory, warning, options) {
    if (warning === void 0) { warning = ""; }
    if (options === void 0) { options = null; }
    return __awaiter(this, void 0, void 0, function () {
        var filename, fullUrl, filepath, response, error_1, gifFile, reply, optionsInline;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (gif == null || gif.filename == null) {
                        logger_1.logger.error("Gif is null or file is null, it should not happen. gif : ", gif);
                        interaction.editReply({ content: "Erreur inattendue, je n'ai pas réussi à trouver le fichier" });
                        return [2];
                    }
                    filename = gif.filename;
                    fullUrl = config_1.gifsBaseUrl + "public/gifs/" + filename;
                    filepath = path.join(cacheDirectory, filename);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 6]);
                    if (!!fs.existsSync(filepath)) return [3, 3];
                    logger_1.logger.info("Cached file does not exist, downloading it from " + fullUrl);
                    return [4, superagent.get(fullUrl)];
                case 2:
                    response = _a.sent();
                    fs.writeFileSync(filepath, response.body);
                    _a.label = 3;
                case 3: return [3, 6];
                case 4:
                    error_1 = _a.sent();
                    logger_1.logger.warn("Error while trying to cache image file at " + filepath + " : ", error_1);
                    return [4, interaction.editReply("Je n'ai pas réussi à télécharger le fichier " + fullUrl)];
                case 5:
                    _a.sent();
                    return [2];
                case 6:
                    logger_1.logger.debug("Sending embed to user. Warning : " + warning + ", options : ", options);
                    gifFile = new discord_js_1.AttachmentBuilder(filepath);
                    reply = new discord_js_1.EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle((gif.quote).substring(0, 255))
                        .setURL(fullUrl)
                        .setAuthor({ name: 'by Pumbaa', iconURL: 'https://avatars.githubusercontent.com/u/34394718?v=4', url: 'https://github.com/pumbaa666' })
                        .setDescription(gif.quote)
                        .addFields({ name: 'Perso principal', value: gif.characters.join(", "), inline: true }, { name: 'Autres perso', value: gif.characters_speaking.join(", "), inline: true })
                        .setImage('attachment://' + filename)
                        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icons/icon-32x32.png' });
                    if (options != null) {
                        optionsInline = options.map(function (option) { return option.value; }).join(", ").toLowerCase() + " (in " + options.map(function (option) { return option.name; }).join(", ").toLowerCase() + ")";
                        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false });
                    }
                    if (warning != "") {
                        reply.addFields({ name: 'Warning', value: warning, inline: false });
                    }
                    logger_1.logger.info("Sending gif " + filepath);
                    return [4, interaction.editReply({ embeds: [reply], files: [gifFile] })];
                case 7:
                    _a.sent();
                    logger_1.logger.debug("Embed sent to user");
                    return [2];
            }
        });
    });
}
//# sourceMappingURL=kaamelott-gifs.js.map