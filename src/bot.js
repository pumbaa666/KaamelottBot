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
const { REST, Routes, EmbedBuilder, Client } = require('discord.js');
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

// TODO proposer des options précises : Titre, Personnage, Episode, etc. Et ne chercher que là dedans (et pas dans le nom du fichier)
// TODO ajouter un bouton pour relancer la commande
// TODO backuper un coup les sons sur pumbaa.ch 
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
                    name: 'anything',
                    description: 'The keyword to search for. Can be a character, an episode or a quote',
                    type: STRING,
                    required: false,
                    channel_type: GUILD_VOICE,
                    
                },
                // {
                //     name: 'title',
                //     description: 'Search only in the title',
                //     type: STRING,
                //     required: false,
                //     channel_type: GUILD_VOICE,
                // }
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
        // Check if the interaction is a slash command
        if (!interaction.isChatInputCommand()) {
            return;
        }

        switch(interaction.commandName) {
            case 'ping': await interaction.reply('Pong!'); break;
            case 'kaamelott': await kaamelott(interaction, sounds, player); break;
            // case 'kaamelottGif': await kaamelottGif(interaction, gifs); break; // TODO
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

    // Get the options (if any)
    const options = interaction.options.data.map(option => option.value);
    logger.debug('option : '+options);
    
    if(options.length == 0) { // Pas d'option, on en file un au hasard
        playAudioSafe(voiceChannel, interaction, player, baseUrl, sounds[getRandomInt(sounds.length - 1)]);
        return;
    }

    // Des options
    const optionsInline = options.join(" ").toLowerCase(); // On concatène les options
    const results = [];

    sounds.forEach(sound => {
        if( sound.character.toLowerCase().includes(options) ||
            sound.episode.toLowerCase().includes(options) ||
            sound.title.toLowerCase().includes(options)) {
                results.push(sound);
        }
    });

    let warning = "";
    if(results.length == 0) { // On n'a rien trouvé, on envoie un truc au pif parmis le tout
        warning = "Aucun résultat, j'en file un au hasard";
        playAudioSafe(voiceChannel, interaction, player, baseUrl, sounds[getRandomInt(sounds.length)], warning, optionsInline);
        return;
    }
    
    if(results.length > 1) { // On a trouvé des trucs, on en envoie 1 au bol
        warning = "1 résultat parmi " + results.length
    }
    
    playAudioSafe(voiceChannel, interaction, player, baseUrl, results[getRandomInt(results.length)], warning, optionsInline);

    return;
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
async function playAudioSafe(voiceChannel, interaction, player, baseUrl, sound, warning = "", options = null) {
    const filename = sound.file;
    let fullUrl = baseUrl + filename;

    // Get current directory absolute path
    const currentFilePath = path.resolve(__dirname);
    const cacheDirectory = currentFilePath + "/../sounds/";
    const filepath = cacheDirectory + filename;

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
        // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        .addFields(
            { name: 'Episode', value: sound.episode , inline: true},
            { name: 'Personnages', value: sound.character , inline: true},
        )
        // .setImage('https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon.png')
        // .setTimestamp()
        .setFooter({ text: 'Longue vie à Kaamelott !', iconURL: 'https://raw.githubusercontent.com/pumbaa666/KaamelottBot/master/resources/icon-32x32.png' });

        if(options != null) {
            reply.addFields({ name: 'Mot-clé', value: options, inline: false});
        }
        if(warning != "") {
            reply.addFields({ name: 'Warning', value: warning, inline: false});
        }

    await interaction.reply({ embeds: [reply] });

    try {
        playAudio(voiceChannel, player, filepath);
    } catch(error) {
        isBotPlayingSound = false;
        logger.error("Error while playing audio at " + fullUrl + " : ", error);
    }
}

function playAudio(voiceChannel, player, fullUrl) {
	const resource = createAudioResource(fullUrl, {
		inputType: StreamType.Arbitrary,
	});
    
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
