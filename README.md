KAAMELOT DISCORD BOT
===

What is it
---
My friends and I are huge fans of the french TV Series [**Kaamelott**](https://fr.wikipedia.org/wiki/Kaamelott) and we can't stop ourselves to quote infamous inside joke about/from the show.
So when I stumbled upon [a repository](https://github.com/2ec0b4/kaamelott-soundboard) listing a bunch of quotes in small audio format I couldn't resist the urge to use it.

**KaamelottBot** is a silly bot who plays quotes in your current Discord audio-channel when you invoke it in any text-channel with `/kaamelott (+option)`

i.e : 
```
/kaamelott revolte
# Bon ben révolte ! TUUUUUUUUT !!
```

Installing the Bot on your Discord channel
---
Open https://discord.com on your browser and login to your account.

Browse https://discord.com/api/oauth2/authorize?client_id=610852695128932362&permissions=277028653120&scope=bot%20applications.commands and grant the permission.
(Replace the `client_id` with yours if you run your own server)

Type `/kaamelott poulette` in any channel



How does it work
---
When triggered with `/kaamelott` the bot will use the following words to search for an audio file who's name contains it.

The files comes from [kaamelott-soundboard GitHub](https://github.com/2ec0b4/kaamelott-soundboard/tree/master/sounds) (a copy exists on [pumbaa.ch](http://pumbaa.ch/public/kaamelott/))

The file names and the full quotes are listed in [a JSON file](https://github.com/2ec0b4/kaamelott-soundboard/blob/master/sounds/sounds.json) (again, copy on [pumbaa.ch](http://pumbaa.ch/public/kaamelott/sounds.json))

It take a random quote from the result, cache the audio locally and play the sound in the Discord audio-channel you're connected too.

The cached files are stored under `KaamelottBot/sounds/cache`

You need write privileges on this folder (at least `755`) `chmod -R 755 KaamelottBot/sounds/cache`.

Hosting your own Server
---
You can host the server on your own machine and not depending on pumbaa.ch

Server Requirements
---
- node 19, nvm
- ffmpeg

Installing the Server
---
**KaamelottBot**

You will find the source here : https://github.com/pumbaa666/KaamelottBot.git
```
git clone https://github.com/pumbaa666/KaamelottBot.git
cd KaamelottBot
npm install --save-dev @discordjs/uws@^10.149.0 # Or npm install -g npm-install-peers
npm install
cp secret/auth-dev.json secret/auth-prod.json
```
(See bellow for `auth-prod.json` content)

**Node** (with NVM, Node Version Manager)

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm --version
# 0.39.3

nvm install 19
node --version
# v19.7.0
```

**FF-MPEG** 

```
apt -y install ffmpeg
ffmpeg -version
# ffmpeg version 4.4.2-0ubuntu0.22.04.1 Copyright (c) 2000-2021 the FFmpeg developers
built with gcc 11 (Ubuntu 11.2.0-19ubuntu1)
```

Launching the Server
---
```
npm start
# KaamelottBot is live !
```

**As a service**

```
which node # Note the absolute path of the node executable
pwd # Note the absolute path of the KaamelotBot directory
# You will use them in the following file :
sudo vi /etc/systemd/system/kaamelott_bot.service
```

```
[Unit]
Description=Discord Kaamelott Bot

[Service]
Type=simple
ExecStart=/usr/bin/node /home/$USER/KaamelottBot/src/bot.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload # Not mandatory on most case. But doesn't hurt.
sudo systemctl start kaamelott_bot.service
```

Creating and configuring the Bot
---
Open https://discord.com on your browser and login to your account
Create a new Application on https://discord.com/developers/applications

**General Information**

Note the `application id`, it's your `client_id` (same as in tab `OAuth2/General`).

**Bot**

Generate the `token` and save it to `KaamelottBot/secret/auth-prod.json` (duplicate it from `auth-dev.json`)
```
{
    "client_id": "YOUR-CLIENT-ID",
    "token": "YOUR-APPLICATION-TOKEN"
}
```

Enable `Presence intent`, `Server members intent`, `Message content intent`.

**OAuth2, General**

*Authorization method* : In-app Authorization
*Scope* : bot, applications.commands
*Bot permissions* : 277028653120
[Text] Send Messages, Send Messages in Threads, Embed Links, Attach Files, Read Message History, Add Reactions, Use Slash Commands
[Voice] Connect, Speak
