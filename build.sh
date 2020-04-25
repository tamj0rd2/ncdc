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
npm run clean

print 'linting'
npm run lint

print 'typechecking'
npm run typecheck

print 'compiling'
npm run compile

# reminder than --verbose can be super useful for debugging
print 'testing and coverage'
npm run cover

if [[ $CODECOV_TOKEN ]];
then
  print 'uploading coverage'
  bash <(curl -s https://codecov.io/bash)
fi

# TODO: update node version
