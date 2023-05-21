// const path = require('path');
// const fs = require('fs');
// const superagent = require('superagent');
const utils = require('./utils');
// const logger = require('../conf/logger');
// const { gifsBaseUrl } = require('../conf/config');
// const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
import { logger } from "../conf/logger";

async function searchAndReplyGif(interaction: typeof Interaction, gifs: Gif[], player: AudioPlayer = null, cacheDirectory: string) {
    await interaction.reply({ content: "Jamais de bougie dans une librairie !!!"});
    logger.debug("Allo?");
    
    // Get the options and subcommands (if any)
    let options = [...interaction.options.data]; // Copy the array because I can't modify the original one // https://stackoverflow.com/questions/59115544/cannot-delete-property-1-of-object-array
    logger.debug('options : ', options);

    if(options.length == 0) { // Pas d'option, on en file un au hasard
        replyWithMediaGif(interaction, gifs[utils.getRandomInt(gifs.length - 1)], cacheDirectory);
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
            const characters = Array.isArray(gif.characters) ? gif.characters.join(",") : gif.characters;
            const charactersSpeaking = Array.isArray(gif.characters_speaking) ? gif.characters_speaking.join(",") : gif.characters_speaking;
            if( characters.toLowerCase().includes(subValue) ||
                charactersSpeaking.toLowerCase().includes(subValue) ||
                gif.quote.toLowerCase().includes(subValue)) {
                    results.push(gif);
            }
        });
    }
        
    else { // Search for each options with corresponding value
        const optionMapping = {
            "perso": "characters", // On ne recheche pas dans characters_speaking car ils sont inclus dans characters
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
        replyWithMediaGif(interaction, gifs[utils.getRandomInt(gifs.length)], cacheDirectory, warning, options);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = warning + "1 résultat parmi " + results.length + "\n";
    }
    
    replyWithMediaGif(interaction, results[utils.getRandomInt(results.length)], cacheDirectory, warning, options);

    return;
}

// https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts
async function replyWithMediaGif(interaction: typeof Interaction, gif: Gif, cacheDirectory: string, warning = "", options: Option[] = null) {
    if(gif == null || gif.filename == null) {
        logger.error("Gif is null or file is null, it should not happen. gif : ", gif);
        interaction.editReply({ content: "Erreur inattendue, je n'ai pas réussi à trouver le fichier"});
        return;
    }

    const filename = gif.filename;
    let fullUrl = gifsBaseUrl + "public/gifs/" + filename;
    const filepath = path.join(cacheDirectory, filename);
    // const filepath2 = getCacheFilePath(filename, "gifs");

    // Cache files
    try {
        if(!fs.existsSync(filepath)) {
            logger.debug("Cached file does not exist, downloading it from " + fullUrl);
            const response = await superagent.get(fullUrl);
            fs.writeFileSync(filepath, response.body);
        }
    } catch(error) {
        logger.warn("Error while trying to cache file at " + filepath + " : ", error);
        // TODO try to send the url instead of the file
        await interaction.editReply("Je n'ai pas réussi à télécharger le fichier " + fullUrl + " : " + error); // To delete when the retry with fullUrl is implemented
        return;
    }

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
        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon-32x32.png' });
    
    if(options != null) {
        const optionsInline = options.map(option => option.value).join(", ").toLowerCase() + " (in " + options.map(option => option.name).join(", ").toLowerCase() + ")"; // On concatène les options
        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false});
    }
    if(warning != "") {
        reply.addFields({ name: 'Warning', value: warning, inline: false});
    }

    await interaction.editReply({ embeds: [reply], files: [gifFile]});
    logger.debug("Embed sent to user");
}

module.exports = {
    searchAndReplyGif,
};