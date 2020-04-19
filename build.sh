#!/usr/bin/env bash
set -e

GREEN='\033[1;32m'
RED='\033[1;31m'
BLUE='\033[1;34m'

print() {
  echo -e "${2:-$BLUE}== $1 ==\033[0m"
}

function finish {
  if [ $? -ne 0 ];
  then
    print 'BUILD.SH FAILED' $RED
  else
    print 'BUILD.SH SUCCESS' $GREEN
  fi
}
trap finish EXIT

print 'cleaning'
yarn clean

print 'linting'
yarn lint

print 'typechecking'
yarn typecheck

print 'compiling'
yarn compile

print 'testing and coverage'
yarn cover --detectOpenHandles --runInBand

print 'All Done :D' $GREEN
