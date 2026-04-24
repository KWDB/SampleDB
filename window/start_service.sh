#!/bin/bash

DEFAULT_LISTEN_PORT="11223"
DEFAULT_HTTP_PORT="8892"
DEFAULT_STORE="./kwbase-data"

LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}
HTTP_ADDR=${2:-$DEFAULT_HTTP_PORT}
STORE=${3:-$DEFAULT_STORE}

./kwbase start-single-node --insecure --listen-addr=127.0.0.1:$LISTEN_ADDR --http-addr=127.0.0.1:$HTTP_ADDR --store=$STORE --background
