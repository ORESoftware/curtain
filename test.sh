#!/usr/bin/env bash

REDIS_CLI=$(which redis-cli)

if [ -z "${REDIS_CLI}" ]; then
echo "redis is not installed locally, please install redis to run the tests"
fi

SUMAN_EXEC=$(cd $(dirname "$0")/node_modules/.bin && pwd)/suman

if [ -e "${SUMAN_EXEC}" ]; then
 echo "looks like you need to run npm install before running the tests, because the suman executable is not present in\
   ./node_modules/.bin"
fi

./node_modules/.bin/suman
