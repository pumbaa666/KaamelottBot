// https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/
// Code totalement faux mais le reste du setup est OK

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
                    if(words.length == 1) { // Pas d'arguments après 'kaamelott'
                        message.channel.send(base_url + sounds[getRandomInt(sounds.length - 1)].file);
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
                            message.channel.send(base_url + sounds[getRandomInt(sounds.length - 1)].file);
                        }
                        else { // On a trouvé des trucs, on en envoie 1 au pif
                            message.channel.send(base_url + results[getRandomInt(results.length - 1)].file);
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

start();