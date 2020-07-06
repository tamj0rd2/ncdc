#!/bin/bash

set -exo pipefail

function curl-harder() {
    for BACKOFF in 0 1 2 4 8 16 16 16 16; do
        sleep $BACKOFF
        if curl -fL --connect-timeout 5 "$@"; then
            return 0
        fi
    done
    return 1
}

# from https://github.com/codecov/codecov-action/issues/69
EVENT_PAYLOAD_FILE=$1

jq --raw-output . "$EVENT_PAYLOAD_FILE"

PRID=`jq ".number // .check_run.pull_requests[0].number" $EVENT_PAYLOAD_FILE`
SHA=`jq -r ".pull_request.head.sha // .check_run.head_sha // .after" $EVENT_PAYLOAD_FILE`

curl-harder -o codecov.sh https://codecov.io/bash

if [ $PRID = "null" ]
then
  bash codecov.sh -Z -C $SHA
else
  bash codecov.sh -Z -C $SHA -P $PRID
fi
