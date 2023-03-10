// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/
// Code totalement faux mais le reste du setup est OK

const Discord = require("discord.js"); 
const auth = require('../secret/auth.json');
const superagent = require('superagent');
const fs = require('fs');
const logger = require('winston');
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

const baseUrl = "http://pumbaa.ch/public/kaamelott/";
let isBotPlayingSound = false;

async function start() {
    try {
        const sounds = await parseSoundJson();
        if(sounds != null) {
            startBot(sounds);
        }
    }
    catch(error) {
        logger.error(error);
    }
}

async function parseSoundJson() {
    const url = baseUrl + "sounds.json";
    const sounds = await superagent.get(url);
    if(!sounds.body || !Array.isArray(sounds.body)) {
        logger.error("There is no sound array at that url " + url);
        return null;
    }
    return sounds.body;
}

function startBot(sounds) {
    const bot = new Discord.Client();
    bot.login(auth.token);

    bot.on('ready', function (evt) {
        logger.info("KaamelottBot is live ! C'est quoi que t'as pas compris ?");
    });
    
    bot.on("message", (message) => {
        logger.debug('incoming message : '+message);
        const messageStr = message.content;
        if (messageStr.substring(0, 1) != '!') {
            return;
        }
        const words = messageStr.substring(1).split(" ");
        switch(words[0]) {
            case 'chut':
                // message.channel.send(baseUrl + "mais_arretez_de_discutailler_cinq_minutes.mp3"); // TODO
                break;

            case 'k':
            case 'kamelot':
            case 'kaamelot':
            case 'kamelott':
            case 'kaamelott':
                if(isBotPlayingSound){
                    message.channel.send("Molo fiston, j'ai pas fini la dernière commande !");
                    break;
                }

                if(words.length == 1) { // Pas d'arguments après 'kaamelott', on en file un au hasard
                    sendMessage(message, "", baseUrl, sounds[getRandomInt(sounds.length - 1)].file);
                    break;
                }

                // Des arguments
                words.shift(); // On supprime le 1er mot, c'était 'kaamelott' (ou k, kamelot, ...)
                const argument = words.join(" ").toLowerCase(); // On concatène les autres
                const results = [];

                sounds.forEach(sound => {
                    if( sound.character.toLowerCase().includes(argument) ||
                        sound.episode.toLowerCase().includes(argument) ||
                        sound.file.toLowerCase().includes(argument) ||
                        sound.title.toLowerCase().includes(argument)) {
                            results.push(sound);
                    }
                });

                if(results.length == 0) { // On n'a rien trouvé, on envoie un truc au pif parmis le tout
                    sendMessage(message,
                            "Je n'ai rien trouvé, désolé :( Mais écoute quand même ça : ",
                            baseUrl,
                            sounds[getRandomInt(sounds.length)].file);
                    break;
                }
                
                // On a trouvé des trucs, on en envoie 1 au pif
                let warning = "";
                if(results.length > 1) {
                    warning = results.length + " résultats, tiens, prend celui-là : "
                }
                sendMessage(message, warning, baseUrl, results[getRandomInt(results.length)].file);
                break;
        }
    });
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function sendMessage(message, str, baseUrl, fileName) {
    message.channel.send(str + baseUrl + fileName);
    playAudio(message, baseUrl, fileName);
}

// https://stackoverflow.com/questions/41580798/how-to-play-audio-file-into-channel
async function playAudio(message, baseUrl, fileName) {
    const voiceChannel = message.member.voiceChannel;
    if(!voiceChannel) {
        return;
    }

    if(isBotPlayingSound) {
        logger.warn("I don't know how, but I'm already playing a sound. Aborting.")
        return;
    }

    isBotPlayingSound = true;

    // Download audio file to local because connection.playFile won't
    // play distant file despite what the doc says.
    try {
        const initialSoundDir = "./sounds/initial/";
        const extendedSoundDir = "./sounds/extended/";
        const extendedFileName = extendedSoundDir + fileName;
        logger.debug("checking if extended file exists : " + extendedFileName);
        if(!fs.existsSync(extendedFileName)) { // Check if we already have the extended version of the audio file
            const initialFileName = initialSoundDir + fileName;
            logger.debug("it does not, checking if initial file exists : " + initialFileName);
            if(!fs.existsSync(initialFileName)) { // if not : check if we have the initial version
                logger.debug("it does not, downloading it from " + baseUrl + fileName);
                const file = fs.createWriteStream(initialFileName);
                await (superagent.get(baseUrl + fileName).pipe(file)); // if not : download it
            }
            
            // For some reason soxi fail to retrieve the sample rate and channels of a freshly downloaded file
            // ... so we wait a bit
            logger.debug("wait for it...");
            await new Promise(resolve => setTimeout(resolve, 500));

            logger.debug("adding blank to " + initialFileName);
            addBlank(fileName); // and extend it
        }

        const connection = await voiceChannel.join();
        logger.info("connected to audio channel to play : " + extendedSoundDir + fileName);

        // It is recommended to change the volume, because the default of 1 is usually too loud.
        // (A reasonable setting is 0.25 or “-6dB”).
        // https://discordv8.readthedocs.io/en/latest/docs_voiceconnection.html
        // playRawStream doesn't exist !
        const dispatcher = connection.playStream(extendedSoundDir + fileName, {volume: "0.5"});
        
        dispatcher.on("end", end => {
            logger.debug("I'm leaving, now");
            voiceChannel.leave();
            isBotPlayingSound = false;
            logger.debug("Vive Astier :)");
        });
    }
    catch(e) {
        logger.error(e);
	    console.log(e);
        isBotPlayingSound = false;
    }
}

// Invoke bash script to add a blank line to the end of the file
// TODO en faire une Promise ?
function addBlank(fileName)
{
    const command = "bash"
    const scriptDir = "./sounds/";
    const scriptPath = scriptDir + "add-blank.sh";
    const source = scriptDir + "initial";
    const destination = scriptDir + "extended";
    console.debug("launching "+command+" script : "+scriptPath+" with fileName : " + fileName + " source : " + source + " destination : " + destination);
    const { exec } = require('child_process');
    exec(command + ' ' + scriptPath + ' ' + fileName + ' ' + source + ' ' + destination, (err, stdout, stderr) => {
        if (err) {
            console.error(err)
        } else {
            // the *entire* stdout and stderr (buffered)
            console.debug(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        }
    });
}

start();
