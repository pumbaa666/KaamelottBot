KAAMELOT DISCORD BOT
===

What is it
---
My friends and I are huge fans of the french TV Series [**Kaamelott**](https://fr.wikipedia.org/wiki/Kaamelott) and we can't stop ourselves to quote infamous inside joke about/from the show.
So when I stumbled upon [a repository](https://github.com/2ec0b4/kaamelott-soundboard) listing a bunch of quotes in small audio format I couldn't resist the urge to use it.

**KaamelottBot** is a silly bot who plays quotes in your current Discord audio-channel when you invoke it in any text-channel with `!k KEY-WORD`
i.e : 
```
!k revolte
# Bon ben révolte !
```

How does it work
---
When triggered with `!k` the bot will use the following words to search for an audio file who's name contains it.
The files comes from http://pumbaa.ch/public/kaamelott/ (TODO use https://github.com/2ec0b4/kaamelott-soundboard/tree/master/sounds ?)
The file names and the full quotes are listed in https://github.com/2ec0b4/kaamelott-soundboard/blob/master/sounds/sounds.json
It take a random quote from the result, download the audio locally, add 3 seconds of blank sound at the end (for some reason the Discord API disconnect too soon and truncate the end of the audio), save all these files in a cache folder and play the sound in the Discord audio-channel you're connected too.

Server Requirements
---
- Node 12
- ffmpeg
- sox, soxi

Installing the Server
---
**Node** (with NVM, Node Version Manager)
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm --version
# 0.39.3

nvm install 12
node --version
# v12.22.12
```

**FF-MPEG** 
```
apt -y install ffmpeg
ffmpeg -version
# ffmpeg version 4.4.2-0ubuntu0.22.04.1 Copyright (c) 2000-2021 the FFmpeg developers
built with gcc 11 (Ubuntu 11.2.0-19ubuntu1)
```

**Sox**
```
apt -y install sox
sox --version
# sox:      SoX v14.4.2
```

**Dependencies**
`npm install`

Launching the Server
---
```
npm start
# KaamelottBot is live !
```

Creating and configuring the Bot
---
Open https://discord.com on your browser and login to your account
Create a new Application on https://discord.com/developers/applications

**General Information**
Note the `api-key` and `application id`.

**Bot**
Generate the `token` and save it to `[root]\secret\auth.json`
```
{
    "token": "YOUR TOKEN"
}
```

Set `Presence intent`, `Server members intent`, `Message content intent under Bot`.

**OAuth2, General**
*Authorization method* : In-app Authorization
*Scope* : bot
*Bot persmissions* : 274881149184
[Text] Send Messages, Send Messages in Threads, Embed Links, Read Message History,
[Voice] Connect, Speak

Installing the Bot on your Discord channel
---
Open https://discord.com on your browser and login to your account.
Update the following url with your application id instead of `<YOUR-APPLICATION-ID>`
Browse `https://discordapp.com/oauth2/authorize?&client_id=<YOUR-APPLICATION-ID>&scope=bot&permissions=274881149184` and grant the permission.
Type `!k poulette` in any channel