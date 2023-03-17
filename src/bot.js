// https://discord.com/developers/docs/interactions/application-commands
// Basic Bot (mon usage) https://github.com/discordjs/voice-examples/blob/main/basic/src/adapter.ts
// Radio Bot : https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts

const superagent = require('superagent');
const fs = require('fs');
const path = require('path');
const { client_id, token } = require('../secret/auth-prod.json');

// https://discord.com/developers/docs/resources/channel#channel-object-channel-types
const CHAT_INPUT = 1;
const GUILD_VOICE = 2
const STRING = 3;
const { REST, Routes, EmbedBuilder, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GatewayIntentBits } = require("discord-api-types/v10");
const {
	StreamType,
	createAudioPlayer,
	createAudioResource,
	entersState,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	joinVoiceChannel,
} = require("@discordjs/voice");

const logger = require('./logger');
logger.level = 'debug';

// TODO ajouter un bouton pour relancer la commande
// TODO ajouter une option --silent pour ne pas jouer le son mais juste afficher la carte.
// TODO bouton pour stoper le son en cours

const baseUrl = "https://raw.githubusercontent.com/crystalskunk/KaamelottBot/master/sounds/";
const fallbackBaseUrl = "http://pumbaa.ch/public/kaamelott/";
let isBotPlayingSound = false;

async function start() {
    const slashCommandsResult = await registerSlashCommands();
    if(slashCommandsResult == false) {
        logger.error("Error registering Slash Commands, aborting");
        return;
    }

    const sounds = await parseSoundJson(baseUrl);
    if(sounds == null) {
        logger.error("Error parsing sounds (see above), aborting");
        return;
    }
    logger.info("Sounds parsed successfully : " + sounds.length + " episodes found.");

    const player = createAudioPlayer();
    if(player == null) {
        logger.error("Error creating audio player, aborting");
        return;
    }

    try {
        startBot(sounds, player);
    }
    catch(error) {
        logger.error("Error starting bot : ", error);
    }
}

async function registerSlashCommands() {
    const commands = [
        {
            name: 'ping',
            description: 'Replies with Pong!',
        },
        {
            name: 'kaamelott',
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
                    description: 'Search only in the text of the quote',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'perso',
                    description: 'Search only when this character speaks',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'titre',
                    description: 'Search only in the title of the episode',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                },
                {
                    name: 'silent',
                    description: 'Do not play the sound, just display the quote',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                }
            ]
        }
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

        // Try again with the fallback url
        if(url != fallbackBaseUrl) {
            return parseSoundJson(fallbackBaseUrl);
        }

        return null;
    }

    // The response is a JSON array, this is our episodes
    if(response.body && Array.isArray(response.body)) {
        return response.body;
    }

    // Try again from response.text (dirty hack 'cause of github...)
    if(response.text != null && response.text != "") {
        const sounds = JSON.parse(response.text);
        
        if(sounds && Array.isArray(sounds)) {
            return sounds;
        }
    }

    // Try again with the fallback url
    if(url != fallbackBaseUrl) {
        return parseSoundJson(fallbackBaseUrl);
    }

    logger.error("There is no sound array at " + fullUrl);
    return null;
}

function startBot(sounds, player) {
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
                case 'kaamelott': await kaamelott(interaction, sounds, player); break;
                // case 'kaamelottGif': await kaamelottGif(interaction, gifs); break; // TODO
            }

            return;
        }

        // The user clicked on a button
        if (interaction.isButton()) {
            // switch(interaction.customId) {
            //     case 'replayAudio': break;
            //     case 'stopCurrentSound': break;
            // }
            if(interaction.customId == 'stopCurrentSound') {
                logger.debug("Stopping current sound");
                player.stop();
                isBotPlayingSound = false;
            }
            else if(interaction.customId == 'replaySlashCommand') {
            }
            else if(interaction.customId.startsWith('replayAudio_')) {
                // const elems = interaction.customId.split('_');
                // const filepath = elems[1];
                const filename = interaction.customId.substring('replayAudio_'.length);
                logger.debug("Replaying file " + filename);
                const filepath = getCacheFilePath(filename);
                playAudio(interaction, player, filepath);
            }

            return;
        }
    });
    
    client.login(token);
}

// TODO
async function kaamelottGifs(interaction, gifs, player) {
}

// TODO rename kaamelottAudio
async function kaamelott(interaction, sounds, player) {
    logger.debug("YOU RAAAAANG ???");
    if(isBotPlayingSound) {
        await interaction.reply("Molo fiston, j'ai pas fini la dernière commande !");
        return;
    }
    isBotPlayingSound = true;
    
    // Check if the user is in a voice channel
    // TODO factoriser
    const channel = interaction.member?.voice.channel;
    if (!channel) {
        logger.debug("User is not in a voice channel");
        await interaction.reply("T'es pas dans un chan audio, gros ! (Ou alors t'as pas les droits)");
        isBotPlayingSound = false;
        return;
    }

    // Get the options and subcommand (if any)
    let silent = false;
    let options = [...interaction.options.data]; // Copy the array because I can't modify the original one // https://stackoverflow.com/questions/59115544/cannot-delete-property-1-of-object-array
    logger.debug('options : ', options);

    let index = options.findIndex(opt => opt.name == "silent");
    if(index != -1) {
        silent = true;
        options.splice(index, 1);
    }

    // index = options.findIndex(opt => opt.name == "*");
    // if(index != -1) {
    //     options.splice(index, 1);
    // }
    
    if(options.length == 0) { // Pas d'option, on en file un au hasard
        playAudioSafe(interaction, player, baseUrl, sounds[getRandomInt(sounds.length - 1)], silent);
        return;
    }

    // Des options.
    // Create a Set of unique results
    let results = new Set();

    // Search anywhere
    const subCommand = options[0].name; // TODO
    const subValue = options[0].value.toLowerCase();
    if(subCommand == "" || subCommand == "tout") {
        sounds.forEach(sound => {
            if( sound.character.toLowerCase().includes(subValue) ||
                sound.episode.toLowerCase().includes(subValue) ||
                sound.title.toLowerCase().includes(subValue)) {
                    results.add(sound);
            }
        });
    } else { // Search for each options with corresponding value
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
        
        results = findArraysIntersection(firstArray, remainingArrays); 
    }

    let warning = "";
    if(results.length == 0) { // On n'a rien trouvé, on envoie un truc au pif parmis le tout
        warning = "Aucun résultat, j'en file un au hasard";
        playAudioSafe(interaction, player, baseUrl, sounds[getRandomInt(sounds.length)], silent, warning, options, subCommand);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = "1 résultat parmi " + results.length
    }
    
    playAudioSafe(interaction, player, baseUrl, results[getRandomInt(results.length)], silent, warning, options, subCommand);

    return;
}

function findArraysIntersection(arr1, arrs){
    // IF there are no arrays to compare to, return everything (it inteserect with itself).
    if(arrs == null || arrs.length == 0) {
        return arr1;
    }

    // If even one array is empty, return nothing, because it doesn't intersect with anything. (it was an empty set)
    arrs.forEach(arr => {
        if(arr == null || arr.length == 0) {
            return [];
        }
    });

    let intersection = [];
    
    first: for (let i = 0; i < arr1.length; i++) {
        let currentObj = arr1[i];

        let nbIntersection = 0;
        second: for (let j = 0; j < arrs.length; j++) {
            if(!arrs[j].includes(currentObj)) { // This episode is not in the current array                
                continue first; // Don't bother checking the other arrays
            } else {
                nbIntersection++; // Found in one array. Check the next one
            }
        }
        if(nbIntersection == arrs.length) {
            intersection.push(currentObj);
        }        
    }
    return intersection;
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

// https://github.com/discordjs/voice-examples/blob/main/radio-bot/src/bot.ts
async function playAudioSafe(interaction, player, baseUrl, sound, silent = false, warning = "", options = null, subCommand = null) {
    if(sound == null || sound.file == null) {
        logger.error("Sound is null or file is null, it should not happen. silent : " + silent + ", warning : " + warning + ", baseurl : " + baseUrl + ", sound : ", sound);
        return;
    }

    const filename = sound.file;
    let fullUrl = baseUrl + filename;
    const filepath = getCacheFilePath(filename);

    // Cache files
    try {
        if(!fs.existsSync(filepath)) {
            logger.debug("Cached file does not exist, downloading it from " + baseUrl + filename);
            const response = await superagent.get(baseUrl + filename);
            fs.writeFileSync(filepath, response.body);
        }
    } catch(error) {
        logger.warn("Error while trying to cache file at " + filepath + " : ", error);
        logger.warn("Trying to play audio directly from source : " + fullUrl);
        filepath = fullUrl;
    }

    // https://discordjs.guide/popular-topics/embeds.html#using-the-embed-constructor
    logger.debug("Sending embed to user. Episode : " + sound.episode + ", Personnages : " + sound.character + ", Warning : " + warning);
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
        const optionsInline = options.map(option => option.value).join(" ").toLowerCase() + (subCommand ? " (in " + subCommand + ")" : ""); // On concatène les options
        reply.addFields({ name: 'Mot-clé', value: optionsInline, inline: false});
    }
    if(warning != "") {
        reply.addFields({ name: 'Warning', value: warning, inline: false});
    }

    // Buttons to replay the command and stop the sound
    // https://discordjs.guide/interactions/buttons.html#building-and-sending-buttons
    // https://discord.js.org/#/docs/builders/main/class/ActionRowBuilder
    // https://discord.js.org/#/docs/builders/main/class/ButtonBuilder
    const rowButtons = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
            .setCustomId('replayAudio_' + filename) // TODO trouver une autre astuce, le nom du fichier peut être trop long et la taille du customId est limitée à 100 caractères
            // .setLabel('Replay Audio')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔄')
        )
        // .addComponents(new ButtonBuilder()
        //     .setCustomId('replaySlashCommand')
        //     // .setLabel('Replay command')
        //     .setStyle(ButtonStyle.Success)
        //     .setEmoji('🔄')
        // )
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
        await playAudio(interaction, player, filepath);
    } catch(error) {
        isBotPlayingSound = false;
        logger.error("Error while playing audio at " + filepath + " : ", error);
    }
}

async function playAudio(interaction, player, filepath) {
	const resource = createAudioResource(filepath, {
		inputType: StreamType.Arbitrary,
	});

    const channel = interaction.member?.voice.channel;
    if (!channel) {
        logger.debug("User is not in a voice channel");
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

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

// Get current directory absolute path
function getCacheFilePath(filename) {
    // return __dirname + "/cache/" + filename;

    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../sounds/";
    const filepath = cacheDirectory + filename;
    return filepath;
}

// Clear local cached files
function clearCache() {
    // TODO
    // demander en option "L'EFFACEUR"
}

function refreshSoundsList() {
    // TODO
    // a relancer toutes les 24h
    // Sinon faut restart le serveur pour MAJ la liste des sons quand y'a une MAJ du github kaamelott-soundboard
}

start();
