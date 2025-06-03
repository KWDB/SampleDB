#!/bin/bash

# 默认参数
DEFAULT_LISTEN_PORT="11223"

# 如果有传入参数，就使用传入的参数，否则使用默认参数
LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < query.sql
