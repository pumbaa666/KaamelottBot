// https://discordjs.guide/voice/audio-player.html#taking-action-within-the-error-handler
// TODO quand on recherche dans Perso, proposer une liste de persos venant du fichier sounds.json. Pareil pour Titre. La même chose dans gifs.

import * as path from 'path';
import * as fs from 'fs';
import * as superagent from "superagent";

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, ButtonInteraction } from "discord.js";
import type { CommandInteraction, CommandInteractionOption, CommandInteractionOptionResolver, Guild, VoiceBasedChannel } from "discord.js";
import type { AudioPlayer } from "@discordjs/voice";
import { GuildMember } from "discord.js";

import { logger } from "../conf/logger";
import { audioBaseUrl } from "../conf/config";
import type { Sound } from "./bot";

import * as utils from './utils';

const {
	StreamType,
	createAudioResource,
	entersState,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	joinVoiceChannel,
} = require("@discordjs/voice");

let isBotPlayingSound = false;

type Character = {
    character: string,
    episode: string,
    title: string,
}


export async function searchAndReplyAudio(interaction: CommandInteraction, sounds: Sound[], player: AudioPlayer, cacheDirectory: string) {
    await interaction.reply({ content: "Jamais de bougie dans une librairie !!!"}); // TODO ajouter un gif animé qui tourne pour faire patienter le user.
    
    // Get the options and subcommands (if any)
    let silent = false;
    let options: CommandInteractionOption[] = [...interaction.options.data]; // Copy the array because I can't modify the original one // https://stackoverflow.com/questions/59115544/cannot-delete-property-1-of-object-array
    logger.info('Searching audio with : ' + options.map(opt => opt.name + ":" + opt.value).join(", "));

    let index = options.findIndex(opt => opt.name == "silencieux");
    if(index != -1) {
        silent = options[index].value as boolean;
        options.splice(index, 1);
    }

    if(options.length == 0) { // Pas d'option, on en file un au hasard
        replyWithMediaAudio(interaction, player, sounds[utils.getRandomInt(sounds.length - 1)], silent, cacheDirectory);
        return;
    }

    // Des options.
    let results = []; // new Set()
    let warning = "";

    // If any options is "Tout", search anywhere and ignore other options
    const allIndex = options.findIndex(opt => opt.name == "tout");    
    if(allIndex != -1) {
        const subValue = (options[allIndex].value as string).toLowerCase();
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
        const optionMapping: { [key: string]: string } = {
        // const optionMapping = {
            "perso": "character",
            "titre": "episode",
            "texte": "title" // Oui c'est fucked up mais c'est comme ça dans l'API
        };
        
        const individualResults:{ [key: string]: Sound[] } = {}; // Avant : []
        options.forEach(option => {
            const optName: string = optionMapping[option.name];
            individualResults[optName] = [];
            sounds.forEach(sound => {
                if(sound[optName].toLowerCase().includes((option.value as string).toLowerCase())) {
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
        replyWithMediaAudio(interaction, player, sounds[utils.getRandomInt(sounds.length)], silent, cacheDirectory, warning, options);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = warning + "1 résultat parmi " + results.length + "\n";
    }
    
    replyWithMediaAudio(interaction, player, results[utils.getRandomInt(results.length)], silent, cacheDirectory, warning, options);

    return;
}

// https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts
async function replyWithMediaAudio(interaction: CommandInteraction, player: AudioPlayer, sound: Sound, silent = false, cacheDirectory: string, warning = "", options: CommandInteractionOption[] = null) {
    if(isBotPlayingSound) {
        await interaction.editReply("Molo fiston, j'ai pas fini la dernière commande !");
        return;
    }

    if(sound == null || sound.file == null) {
        logger.error("Sound is null or file is null, it should not happen. sound : ", sound);
        await interaction.editReply("Une erreur survenue est inattandue !");
        return;
    }

    const filename = sound.file;
    let fullUrl = audioBaseUrl + filename;
    const filepath = path.join(cacheDirectory, filename);

    // Cache files
    try {
        if(!fs.existsSync(filepath)) {
            logger.debug("Cached file does not exist, downloading it from " + fullUrl);
            const response = await superagent.get(fullUrl);
            fs.writeFileSync(filepath, response.body);
        }
    } catch(error) {
        // TODO fallback here
        logger.warn("Error while trying to cache audio file at " + filepath + " : ", error);
        await interaction.editReply("Je n'ai pas réussi à télécharger le fichier " + fullUrl);
        return;
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
            { name: 'Personnages', value: sound.character, inline: true }, // TODO inclure l'image du perso depuis le dossier `characters-icons`
        )
        // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        // .setImage('https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon.png')
        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icons/icon-32x32.png' }
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
    const rowButtons = new ActionRowBuilder<ButtonBuilder>()
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

    await interaction.editReply({ embeds: [reply], components: [rowButtons] });

    if(silent) {
        logger.debug("Silent mode, not playing audio");
        return;
    }

    await playAudio(interaction, player, filepath);
}

async function connectToVoiceChannel(channel: VoiceBasedChannel) {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
	});
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 2_000);
		return connection;
	} catch (error) {
		connection.destroy();
        throw error;
	}
}

export async function playAudio(interaction: CommandInteraction | ButtonInteraction, player: AudioPlayer, filepath: string) {
    const channel: VoiceBasedChannel = (interaction.member as GuildMember)?.voice.channel;
    
    if(isBotPlayingSound) {
        await interaction.editReply("Molo fiston, j'ai pas fini la dernière commande !");
        return;
    }

    if (channel == null) {
        await interaction.editReply("🔇 T'es pas dans un chan audio, gros ! (Ou alors t'as pas les droits) ⚠️");
        return;
    }

    isBotPlayingSound = true;

	const resource = createAudioResource(filepath, {
		inputType: StreamType.Arbitrary,
	});

    // Try to connect to the user's voice channel
    let voiceChannel = null;
    try {
        voiceChannel = await connectToVoiceChannel(channel);
    } catch(error) {
        isBotPlayingSound = false;
        logger.warn("Error trying to connect to channel : ", error); // Could be because of some proxy filtering the connection.
        return;
    }
    logger.debug("connected to voice channel : " + channel.name)
    
    try {
        voiceChannel.subscribe(player);
        player.play(resource); // , {volume: "0.5"}
        logger.info("Playing audio " + filepath)
        player.on("stateChange", state => {
            logger.debug("State changed to " + state.status);
            if(state.status == AudioPlayerStatus.Playing) { // Why Playing and not Idle ?
                isBotPlayingSound = false; 
                logger.debug("Longue vie à Kaamelott !");
            }
        });
    } catch(error) {
        logger.error("Error while playing audio from " + filepath + " : ", error);
        logger.error(" - Player : ", player);
        logger.error(" - VoiceChannel : ", voiceChannel);
        logger.error(" - Resource : ", resource);
    }

	return entersState(player, AudioPlayerStatus.Playing, 5000);
}

export function stopAudio(player: AudioPlayer)
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
