KAAMELOT DISCORD BOT
===

What is it
---
This bot plays audio file in Discord audio-channels

TODO


Write `!k KEY-WORD` in any text-channel to make it search the KEY-WORD into it's database and play an audio file in your current Discord audio-channel.
i.e : `!k revolte`
 > Bon ben révolte !

Server Requirements
---
Node 12
ffmpeg
sox, soxi

Installing the Server
---
Node (with NVM, Node Version Manager) :
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

FF-MPEG : 
```
apt -y install ffmpeg
ffmpeg -version
# ffmpeg version 4.4.2-0ubuntu0.22.04.1 Copyright (c) 2000-2021 the FFmpeg developers
built with gcc 11 (Ubuntu 11.2.0-19ubuntu1)
```

Sox : 
```
apt -y install sox
sox --version
# sox:      SoX v14.4.2
```

Dependencies :
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

