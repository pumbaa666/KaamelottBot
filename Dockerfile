FROM    node:20-bullseye-slim

RUN     mkdir /kaamelott_bot
WORKDIR /kaamelott_bot

RUN     apt-get update && \
        apt-get install --no-install-recommends -y \
        ffmpeg

COPY    package*.json /kaamelott_bot/
RUN     npm install

# don't forget to put your Discord API credentials in conf/auth-prod.json !
COPY    bin     /kaamelott_bot/bin
COPY    conf    /kaamelott_bot/conf
COPY    resources /kaamelott_bot/resources
# COPY    resources/kaamelott_bot.service /etc/systemd/system/kaamelott_bot.service
COPY    gifs/gifs.json /kaamelott_bot/gifs/gifs.json
COPY    sounds/sounds.json /kaamelott_bot/sounds/sounds.json

# EXPOSE  1974

CMD     [ "node", "/kaamelott_bot/bin/src/bot.js" ]
