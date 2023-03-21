const path = require('path');
const fs = require('fs');
const superagent = require('superagent');

const utils = require('./utils');
const logger = require('../conf/logger');
const { gifsBaseUrl } = require('../conf/config');

// const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Get current directory absolute path
function getCacheFilePath(filename) {
    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../gifs/";
    const filepath = cacheDirectory + filename;
    return filepath;
}

async function kaamelottGifs(interaction, gifs, player) {
    logger.debug("Allo?");
    
    // Get the options and subcommands (if any)
    let options = [...interaction.options.data]; // Copy the array because I can't modify the original one // https://stackoverflow.com/questions/59115544/cannot-delete-property-1-of-object-array
    logger.debug('options : ', options);

    if(options.length == 0) { // Pas d'option, on en file un au hasard
        replyAndSendGif(interaction, gifs[utils.getRandomInt(gifs.length - 1)]);
        return;
    }

    // Des options.
    let results = []; // new Set()
    let warning = "";

    // If any options is "Tout", search anywhere and ignore other options
    const allIndex = options.findIndex(opt => opt.name == "tout");    
    if(allIndex != -1) {
        const subValue = options[allIndex].value.toLowerCase();
        if(options.length > 1) {
            warning = warning + "J'ai ignoré les autres options car tu as demandé Tout.\n";
            options = [options[allIndex]];
        }
        gifs.forEach(gif => {
            if( gif.characters.toLowerCase().includes(subValue) ||
                gif.characters_speaking.toLowerCase().includes(subValue) ||
                gif.quote.toLowerCase().includes(subValue)) {
                    results.push(gif);
            }
        });
    }
        
    else { // Search for each options with corresponding value
        const optionMapping = {
            "perso": "characters",
            "texte": "quote"
        };
        
        const individualResults = [];
        options.forEach(option => {
            const optName = optionMapping[option.name];
            individualResults[optName] = [];
            gifs.forEach(gif => {
                const optionsInline = Array.isArray(gif[optName]) ? gif[optName].join(",") : gif[optName];
                if(optionsInline.toLowerCase().includes(option.value.toLowerCase())) {
                    individualResults[optName].push(gif);
                }
            });
        });

        let firstArray = null;
        let remainingArrays = [];
        for(const [key, value] of Object.entries(individualResults)) {
            if(firstArray == null) {
                firstArray = value;
            } else {
                remainingArrays.push(value);
            }
        };
        
        results = utils.findArraysIntersection(firstArray, remainingArrays); 
    }

    if(results.length == 0) { // On n'a rien trouvé, on envoie un truc au pif parmis le tout
        warning = warning + "Aucun résultat, j'en file un au hasard\n";
        replyAndSendGif(interaction, gifs[utils.getRandomInt(gifs.length)], warning, options);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = warning + "1 résultat parmi " + results.length + "\n";
    }
    
    replyAndSendGif(interaction, results[utils.getRandomInt(results.length)], warning, options);

    return;
}

// https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts
async function replyAndSendGif(interaction, gif, warning = "", options = null) {
    if(gif == null || gif.filename == null) {
        logger.error("Gif is null or file is null, it should not happen. warning : " + warning + ", gif : ", gif);
        return;
    }

    const filename = gif.filename;
    let fullUrl = gifsBaseUrl + "public/gifs/" + filename;
    const filepath = getCacheFilePath(filename);

    // Cache files
    try {
        if(!fs.existsSync(filepath)) {
            logger.debug("Cached file does not exist, downloading it from " + fullUrl);
            const response = await superagent.get(fullUrl);
            fs.writeFileSync(filepath, response.body);
        }
    } catch(error) {
        logger.warn("Error while trying to cache file at " + filepath + " : ", error);
    }

    // https://discordjs.guide/popular-topics/embeds.html#using-the-embed-constructor
    logger.debug("Sending embed to user. Warning : " + warning + ", options : ", options);

    // https://discordjs.guide/popular-topics/embeds.html#attaching-images
    const gifFile = new AttachmentBuilder(filepath);
    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle((gif.quote).substring(0, 255))
        .setURL(fullUrl)
        .setAuthor({ name: 'by Pumbaa', iconURL: 'https://avatars.githubusercontent.com/u/34394718?v=4', url: 'https://github.com/pumbaa666' })
        .setDescription(gif.quote)
        .addFields(
            { name: 'Perso principal', value: gif.characters.join(", "), inline: true },
            { name: 'Autres perso', value: gif.characters_speaking.join(", "), inline: true },
        )
        // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .setImage('attachment://' + filename)
        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon-32x32.png' }
    );
    
    if(options != null) {
        const optionsInline = options.map(option => option.value).join(", ").toLowerCase() + " (in " + options.map(option => option.name).join(", ").toLowerCase() + ")"; // On concatène les options
        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false});
    }
    if(warning != "") {
        reply.addFields({ name: 'Warning', value: warning, inline: false});
    }

    await interaction.reply({ embeds: [reply], files: [gifFile]});
}

async function clearCache(interaction) {
    logger.debug("Clearing Gifs cache");
    const cacheDirectory = getCacheFilePath("");
    let nbDeletedFiles = 0;
    let nbSkippedFiles = 0;
    const files = fs.readdirSync(cacheDirectory);
        
    for (const file of files) {
        if(!file.endsWith(".gif")) {
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
    interaction.reply("Cache cleared. " + nbDeletedFiles + " files deleted, " + nbSkippedFiles + " files skipped.");
}

module.exports = {
    kaamelottGifs,
    clearCache
};