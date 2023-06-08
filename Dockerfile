FROM    node:20-bullseye-slim AS buildLayer

# FFMPEG is required (by Discord API ?) to play gifs
RUN     apt-get update && \
        apt-get install --no-install-recommends -y \
        ffmpeg

FROM    bitnami/minideb:latest AS finalLayer
COPY    --from=buildLayer /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY    --from=buildLayer /usr/local/bin/ /usr/local/bin/
COPY    --from=buildLayer /usr/local/lib/ /usr/local/lib/
COPY    --from=buildLayer /opt/yarn* /opt/
COPY    --from=buildLayer /usr/local/lib/node_modules/ /usr/local/lib/node_modules/

ARG     APP_ROOT=/kaamelott_bot
RUN     mkdir -p $APP_ROOT/
WORKDIR $APP_ROOT/

# /!\ BEFORE YOUR FIRST BUILD /!\
# Don't forget to put your Discord API credentials in conf/auth-prod.json !
COPY    bin     $APP_ROOT/bin
COPY    conf    $APP_ROOT/conf
COPY    resources $APP_ROOT/resources
COPY    gifs/gifs.json $APP_ROOT/gifs/gifs.json
COPY    sounds/sounds.json $APP_ROOT/sounds/sounds.json
# # If you to include the sounds and gifs, uncomment the following lines. Beware, it will increase the image size !
# COPY    gifs $APP_ROOT/gifs
# COPY    sounds $APP_ROOT/sounds
COPY    package*.json $APP_ROOT/

ENV     KAAMELOTT_BOT_VERSION=1.2.0
ENV     PATH="$PATH:/usr/bin/ffmpeg/:/usr/local/bin/node/:/usr/local/bin/npm/"

RUN     npm install

CMD     [ "node", "bin/src/bot.js" ]

# For debugging purpose. Comment CMD above and uncomment the following lines
# ENTRYPOINT ["/bin/bash"]