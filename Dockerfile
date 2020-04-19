FROM node:12.16.2-alpine as base

RUN apk add --no-cache bash
ENV HUSKY_SKIP_INSTALL=true

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
