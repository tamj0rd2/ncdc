FROM node:12.21.0-alpine as base

RUN apk add --no-cache bash
RUN apk add --no-cache curl
RUN apk add --no-cache git
ENV JQ_VERSION='1.6'
RUN apk add --no-cache jq

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV HUSKY_SKIP_INSTALL=true
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM base as install
FROM base as compile
RUN npm run compile

FROM compile as black-box
RUN npm ci --prefix ./black-box-tests/shared

#== acceptance tests setup ==#
FROM black-box as acceptance-tests

#== pre-release tests setup ==#
FROM black-box as pre-release-tests
RUN mv $(npm pack | tail -n 1) ./black-box-tests/pre-release/ncdc.tgz

WORKDIR /usr/src/app/black-box-tests/pre-release
RUN rm -rf ../../node_modules
RUN npm ci
RUN npm install ./ncdc.tgz
RUN npm run typecheck
