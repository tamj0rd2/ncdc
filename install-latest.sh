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
    print 'ncdc install failed' $RED
  else
    print 'ncdc install complete' $GREEN
  fi
}
trap finish EXIT

print 'getting latest ncdc tag'
NCDC_VERSION=$(git describe --abbrev=0 --tags)

print "installing ncdc $NCDC_VERSION"
npm i ncdc@$NCDC_VERSION
