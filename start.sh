#!/bin/bash

npm install express node-telegram-bot-api localtunnel
wait
# Chạy bot với MASTER_URL
MASTER_URL=https://plain-bats-end.loca.lt node bot.js
