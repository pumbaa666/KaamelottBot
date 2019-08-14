// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/
// Code totalement faux mais le reste du setup est OK


// TODO Tu sais que t'as des bots de musique  qui sont des users qui join ton chan vocal et qui envoient des sons youtube que tu lui demande

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
    const url = "http://pumbaa.ch/public/kaamelott/sounds.json";
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
        logger.info('Connected');
    });
    
    bot.on("message", (message) => {
        const messageStr = message.content;
        if (messageStr.substring(0, 1) == '!') {
            const words = messageStr.substring(1).split(" ");
            const firstWord = words[0];
           
            switch(firstWord) {
                case 'chut':
                    message.channel.send(baseUrl + "mais_arretez_de_discutailler_cinq_minutes.mp3"); 
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

                    if(words.length == 1) { // Pas d'arguments après 'kaamelott'
                        sendMessage(message, "", baseUrl, sounds[getRandomInt(sounds.length - 1)].file);
                    }
                    else { // des arguments
                        words.shift();
                        const argument = words.join(" ").toLowerCase();
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
                                    baseUrl, sounds[getRandomInt(sounds.length - 1)].file
                                );
                        }
                        else { // On a trouvé des trucs, on en envoie 1 au pif
                            let warning = "";
                            if(results.length > 1) {
                                warning = results.length + " résultats, tiens, prend celui-là : "
                            }
                            sendMessage(message, warning, baseUrl, results[getRandomInt(results.length)].file);
                        }
                    }
                break;
            }
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

    isBotPlayingSound = true;
    const c_fileName = fileName;

    // Download audio file to local because connection.playFile won't
    // play distant file despite what the doc says.
    try {
        if(!fs.existsSync("./sounds/" + fileName)) {
            logger.debug("downloading " + "./sounds/" + fileName);
            const file = fs.createWriteStream("./sounds/" + fileName);
            await (superagent.get(baseUrl + fileName).pipe(file));
        }

        const connection = await voiceChannel.join();
        logger.debug("connected to audio channel");

        // It is recommended to change the volume, because the default of 1 is usually too loud.
        // (A reasonable setting is 0.25 or “-6dB”).
        // https://discordv8.readthedocs.io/en/latest/docs_voiceconnection.html
        // playRawStream doesn't exist !
        const dispatcher = connection.playFile("./sounds/" + c_fileName, {volume: "0.5"}); // Doesn't work with await
        
        dispatcher.on("end", end => {
            voiceChannel.leave();
            isBotPlayingSound = false;
            logger.debug("disconnected");
        });
    }
    catch(e) {
        logger.error(e);
	    console.log(e);
        isBotPlayingSound = false;
    }
}

start();
