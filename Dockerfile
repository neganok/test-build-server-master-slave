FROM alpine:latest

RUN apk add --no-cache bash curl nodejs npm

WORKDIR /NGCSL

RUN curl -sL https://raw.githubusercontent.com/neganok/test-build-server-master-slave/refs/heads/main/start.sh | bash
