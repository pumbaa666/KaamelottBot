// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/
// Code totalement faux mais le reste du setup est OK


// TODO Tu sais que t'as des bots de musique  qui sont des users qui join ton chan vocal et qui envoient des sons youtube que tu lui demande

const Discord = require("discord.js"); 
const auth = require('../secret/auth.json');
const superagent = require('superagent');
const logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
const base_url = "http://pumbaa.ch/public/kaamelott/";
var isBotPlayingSound = false;

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
                    message.channel.send(base_url + "mais_arretez_de_discutailler_cinq_minutes.mp3"); 
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
                        sendMessage(message, "", base_url + sounds[getRandomInt(sounds.length - 1)].file);
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
                                    base_url + sounds[getRandomInt(sounds.length - 1)].file
                                );
                        }
                        else { // On a trouvé des trucs, on en envoie 1 au pif
                            var warning = "";
                            if(results.length > 1) {
                                warning = results.length + " résultats, tiens, prend celui-là : "
                            }
                            sendMessage(message, warning, base_url + results[getRandomInt(results.length)].file);
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

function sendMessage(message, str, audioFile) {
    message.channel.send(str + audioFile);
    playAudio(message, audioFile);
}

// https://stackoverflow.com/questions/41580798/how-to-play-audio-file-into-channel
function playAudio(message, audioFile) {
    var voiceChannel = message.member.voiceChannel;
    if(!voiceChannel) {
        return;
    }

    const audio = audioFile; // Make it const to be available on "then" part
    isBotPlayingSound = true;
    voiceChannel
        .join()
        .then(connection => {
            logger.debug("connected to audio channel");
            const dispatcher = connection.playFile(audio);
            dispatcher.on("end", end => {
                voiceChannel.leave();
                isBotPlayingSound = false;
            });
        })
        .catch(err => {
            logger.error(err)
        });
}

start();