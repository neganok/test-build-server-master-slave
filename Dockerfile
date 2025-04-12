FROM alpine:latest

RUN apk add --no-cache bash curl nodejs npm git

WORKDIR /NGCSL
COPY . . 

RUN npm install express node-telegram-bot-api localtunnel


RUN MASTER_URL=https://grumpy-lands-admire.loca.lt node bot.js
