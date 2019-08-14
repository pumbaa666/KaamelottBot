Only works with node 8.x

curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh -o install_nvm.sh
chmod +x install_nvm.sh
./install_nvm.sh
nvm install 8
nvm use 8

nvm --version
#0.33.11

node -v
#v8.16.0

# Update repo
# https://www.jesusamieiro.com/failed-to-fetch-https-packages-sury-org-php-dists-stretch-inrelease/
sudo wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
apt update

apt install python
python -V
#Python 2.7.13

apt install build-essential
gcc --version
#gcc (Debian 6.3.0-18+deb9u1) 6.3.0 20170516

apt install make
make --version
#GNU Make 4.1

apt install 
ffmpeg -version
#ffmpeg version 3.2.14-1~deb9u1 Copyright (c) 2000-2019 the FFmpeg developers

npm install
npm start
