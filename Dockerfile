FROM node:12.16.2-alpine as base

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
