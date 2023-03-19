const path = require('path');
const fs = require('fs');
const superagent = require('superagent');

const utils = require('./utils');
const logger = require('../conf/logger');
const { baseUrl } = require('../conf/config');

// const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
	StreamType,
	createAudioResource,
	entersState,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	joinVoiceChannel,
} = require("@discordjs/voice");

let isBotPlayingSound = false;

// Get current directory absolute path
function getCacheFilePath(filename) {
    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../sounds/";
    const filepath = cacheDirectory + filename;
    return filepath;
}

async function kaamelottAudio(interaction, sounds, player) {
    logger.debug("YOU RAAAAANG ???");
    
    // Get the options and subcommands (if any)
    let silent = false;
    let options = [...interaction.options.data]; // Copy the array because I can't modify the original one // https://stackoverflow.com/questions/59115544/cannot-delete-property-1-of-object-array
    logger.debug('options : ', options);

    let index = options.findIndex(opt => opt.name == "silencieux");
    if(index != -1) {
        silent = options[index].value;
        options.splice(index, 1);
    }

    if(options.length == 0) { // Pas d'option, on en file un au hasard
        replyAndPlayAudio(interaction, player, sounds[utils.getRandomInt(sounds.length - 1)], silent);
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
        sounds.forEach(sound => {
            if( sound.character.toLowerCase().includes(subValue) ||
                sound.episode.toLowerCase().includes(subValue) ||
                sound.title.toLowerCase().includes(subValue)) {
                    results.push(sound);
            }
        });
    }
        
    else { // Search for each options with corresponding value
        const optionMapping = {
            "perso": "character",
            "titre": "episode",
            "texte": "title", // Oui c'est fucked up mais c'est comme ça dans l'API
            "tout": "tout"
        };
        
        const individualResults = [];
        options.forEach(option => {
            const optName = optionMapping[option.name];
            individualResults[optName] = [];
            sounds.forEach(sound => {
                if(sound[optName].toLowerCase().includes(option.value.toLowerCase())) {
                    individualResults[optName].push(sound);
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
        replyAndPlayAudio(interaction, player, sounds[utils.getRandomInt(sounds.length)], silent, warning, options);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = warning + "1 résultat parmi " + results.length + "\n";
    }
    
    replyAndPlayAudio(interaction, player, results[utils.getRandomInt(results.length)], silent, warning, options);

    return;
}

// https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts
async function replyAndPlayAudio(interaction, player, sound, silent = false, warning = "", options = null) {
   
    if(sound == null || sound.file == null) {
        logger.error("Sound is null or file is null, it should not happen. warning : " + warning + ", sound : ", sound);
        isBotPlayingSound = false;
        return;
    }

    const filename = sound.file;
    let fullUrl = baseUrl + filename;
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
    const reply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle((sound.file).substring(0, 255))
        .setURL(fullUrl)
        .setAuthor({ name: 'by Pumbaa', iconURL: 'https://avatars.githubusercontent.com/u/34394718?v=4', url: 'https://github.com/pumbaa666' })
        .setDescription(sound.title)
        .addFields(
            { name: 'Episode', value: sound.episode, inline: true },
            { name: 'Personnages', value: sound.character, inline: true },
        )
        // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        // .setImage('https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon.png')
        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon-32x32.png' }
    );
    
    if(options != null) {
        const optionsInline = options.map(option => option.value).join(", ").toLowerCase() + " (in " + options.map(option => option.name).join(", ").toLowerCase() + ")"; // On concatène les options
        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false});
    }
    if(warning != "") {
        reply.addFields({ name: 'Warning', value: warning, inline: false});
    }

    // Create a temp file to store the name of the audio file
    // We will use this value to replay the audio when clicking on the button
    // This is a bit messy but you can't set data in a button.
    const tmpFilePath = '/tmp/kb-replay_' + `${Math.random().toString(36).substring(2, 16)}`;
    fs.writeFileSync(tmpFilePath, filename);

    // Buttons to replay the command and stop the sound
    // https://discordjs.guide/interactions/buttons.html#building-and-sending-buttons
    // https://discord.js.org/#/docs/builders/main/class/ActionRowBuilder
    // https://discord.js.org/#/docs/builders/main/class/ButtonBuilder
    const rowButtons = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
            .setCustomId('replayAudio_' + tmpFilePath)
            // .setLabel('Replay Audio')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔄')
        )
        .addComponents(new ButtonBuilder()
            .setCustomId('stopCurrentSound')
            // .setLabel('Stop sound')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔇')
        );

    await interaction.reply({ embeds: [reply], components: [rowButtons] });

    if(silent) {
        logger.debug("Silent mode, not playing audio");
        isBotPlayingSound = false;
        return;
    }

    try {
        await playAudio(interaction, player, filename);
    } catch(error) {
        isBotPlayingSound = false;
        logger.error("Error while playing audio at " + filepath + " : ", error);
    }
}

async function connectToChannel(channel) {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		// @ts-expect-error Currently voice is built in mind with API v10 whereas discord.js v13 uses API v9.
		adapterCreator: channel.guild.voiceAdapterCreator,
	});
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
		return connection;
	} catch (error) {
        logger.error("Error connecting to voice channel : ", error);
		connection.destroy();
        return null;
	}
}

async function playAudio(interaction, player, filename) {
    if(isBotPlayingSound) {
        await interaction.reply("Molo fiston, j'ai pas fini la dernière commande !");
        return;
    }
    isBotPlayingSound = true;

    const filepath = getCacheFilePath(filename);
	const resource = createAudioResource(filepath, {
		inputType: StreamType.Arbitrary,
	});

    const channel = interaction.member?.voice.channel;
    if (!channel) {
        await interaction.reply("T'es pas dans un chan audio, gros ! (Ou alors t'as pas les droits)");
        isBotPlayingSound = false;
        return;
    }

    // Try to connect to the user's voice channel
    const voiceChannel = await connectToChannel(channel);
    if(voiceChannel == null) {
        await interaction.reply("Je n'ai pas réussi à me connecter au canal audio :'(");
        isBotPlayingSound = false;
        return;
    }
    logger.debug("connected to voice channel : " + interaction.member?.voice.channel.name)
    
    voiceChannel.subscribe(player);
	player.play(resource); // , {volume: "0.5"}
    player.on("stateChange", state => {
        logger.debug("State changed to " + state.status);
        if(state.status == AudioPlayerStatus.Playing) { // Why Playing and not Idle ?
            isBotPlayingSound = false; 
            logger.debug("Longue vie à Kaamelott !");
        }
    });

	return entersState(player, AudioPlayerStatus.Playing, 5000);
}

function stopAudio(player)
{
    logger.debug("Stopping current sound");
    isBotPlayingSound = false;
    try {
        player.stop();
    }
    catch(error) {
        logger.error("Error while trying to stop current sound : ", error);
    }
}

async function clearCache(interaction) {
    logger.debug("Clearing cache");
    const cacheDirectory = getCacheFilePath("");
    let nbDeletedFiles = 0;
    let nbSkippedFiles = 0;
    const files = fs.readdirSync(cacheDirectory);
        
    for (const file of files) {
        if(!file.endsWith(".mp3")) {
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
    kaamelottAudio,
    playAudio,
    stopAudio,
    clearCache
}
