FROM node:12.16.2-alpine as base

RUN apk add --no-cache bash
RUN apk add --no-cache curl
RUN apk add --no-cache git

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

FROM base as setup
FROM base as post_deploy

RUN apk add --no-cache jq

COPY package.json package-lock.json ./
# Necessary because you can't install ncdc inside of ncdc
RUN cat package.json | jq '.name = "ncdcpostdeploy"' > temp.json && mv temp.json package.json
RUN cat package-lock.json | jq '.name = "ncdcpostdeploy"' > temp.json && mv temp.json package-lock.json
RUN npm ci

COPY .git ./.git
COPY install-latest.sh ./
RUN ./install-latest.sh

COPY tsconfig.json jest.config.js .babelrc ./
COPY acceptance-tests ./acceptance-tests
