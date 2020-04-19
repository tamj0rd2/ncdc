FROM node:12.16.2-alpine as base

RUN apk add --no-cache bash
RUN apk add --no-cache curl

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV HUSKY_SKIP_INSTALL=true
COPY package.json package-lock.json ./

RUN npm ci

COPY . .
