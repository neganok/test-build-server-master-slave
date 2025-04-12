FROM alpine:latest

RUN apk add --no-cache bash curl nodejs npm git

WORKDIR /NGCSL
COPY . . 
RUN MASTER_URL=https://heavy-shoes-walk.loca.lt node bot.js
