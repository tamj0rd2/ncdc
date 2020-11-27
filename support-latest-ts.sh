#!/usr/bin/env bash
set -e

GREEN='\033[1;32m'
RED='\033[1;31m'
BLUE='\033[1;34m'

print() {
  echo -e "${2:-$BLUE} $1 \033[0m"
}

function finish {
  if [ $? -ne 0 ];
  then
    print '== Something went wrong ==' $RED
  fi

  set +e
}
trap finish EXIT

if [[ "$(git st | grep -cim1 'untracked files')" -eq 1 || "$(git st | grep -cim1 'not staged')" -eq 1 ]]
then
  print 'You have unstaged changes. Commit or stash them first'
  exit 1
fi


CURRENT_VERSION="$(npx tsc --version | sed 's/Version //g')"

print 'npm i -D typescript@latest'
npm i -D typescript@latest

UPDATED_VERSION="$(npx tsc --version | sed 's/Version //g')"

if [[ "$UPDATED_VERSION" == "$CURRENT_VERSION" ]];
then
  print 'Already using the latest version of typescript'
  exit 0
fi

print 'npm i -D --prefix ./black-box-tests/pre-release typescript@latest'
npm i -D --prefix ./black-box-tests/pre-release typescript@latest

print 'npm i --save ts-json-schema-generator@latest'
npm i ts-json-schema-generator@latest

print 'docker-compose build'
docker-compose build typecheck unit-tests integration-tests acceptance-tests pre-release-tests

print './tests.sh'
./tests.sh

print 'TODO: commit the changes back in'
# git commit -am "feat(deps): support for typescript v${UPDATED_VERSION}" --no-verify