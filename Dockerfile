FROM node:12.18.4-alpine as base

RUN apk add --no-cache bash
RUN apk add --no-cache curl
RUN apk add --no-cache git

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV HUSKY_SKIP_INSTALL=true
COPY package.json package-lock.json ./

RUN npm ci
COPY . .

FROM base as install
FROM base as compile
RUN npm run compile

#== pre-release tests setup ==#
FROM compile as pre-release-tests
RUN mv $(npm pack | tail -n 1) ./black-box-tests/pre-release/ncdc.tgz

WORKDIR /usr/src/app/black-box-tests/pre-release
RUN npm ci
RUN npm install ./ncdc.tgz
RUN npm run build
