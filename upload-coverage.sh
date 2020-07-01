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

curl-harder -o codecov.sh https://codecov.io/bash
bash codecov.sh -Z
