#!/usr/bin/env bash

REDIS_CLI=$(which redis-cli)

if [ -z "${REDIS_CLI}" ]; then
echo "redis is not installed locally, please install redis to run the tests"
exit 1;
fi

SUMAN_EXEC=$(cd $(dirname "$0")/node_modules/.bin && pwd)/suman

RL=$(readlink "$SUMAN_EXEC")

echo "RL => $RL"

if [ ! -e "${RL}" ]; then
 echo " => Suman test message => looks like you need to run npm install before running the tests
 because the suman executable is not present at '$SUMAN_EXEC'"
  echo # new line
   echo # new line
   exit 1;
fi

./node_modules/.bin/suman
