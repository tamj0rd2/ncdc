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
    print 'TESTS FAILED' $RED
  else
    print 'TESTS SUCCESS' $GREEN
  fi

  set +e
}
trap finish EXIT

print 'lint'
docker-compose run lint

print 'typecheck'
docker-compose run typecheck

print 'unit tests'
docker-compose run unit-tests

print 'integration tests'
docker-compose run integration-tests

print 'acceptance tests'
docker-compose run acceptance-tests

print 'uploading coverage'
bash <(curl -s https://codecov.io/bash) -Z

print 'pre release tests'
docker-compose build pre-release-tests
docker-compose run pre-release-tests
