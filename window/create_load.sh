#!/bin/bash

DEFAULT_LISTEN_PORT="11223"
LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < create_load.sql
