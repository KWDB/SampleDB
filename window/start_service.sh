#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=window/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"

usage() {
  cat <<EOF
用法:
  bash start_service.sh [listen_port] [http_port] [store]
  bash start_service.sh [--port listen_port] [--http-port http_port] [--store store]
  bash start_service.sh --container <container_name> [--port container_sql_port]

说明:
  裸机模式会启动当前目录下的 ./kwbase。
  容器模式要求 KWDB 容器已经启动，本脚本只检查容器状态，不在容器内启动数据库。
EOF
}

kwdb_parse_options "$@"

if [ "$KWDB_SHOW_HELP" = "1" ]; then
  usage
  exit 0
fi

kwdb_apply_positional_port
kwdb_apply_positional_http_port
kwdb_apply_positional_store
kwdb_set_default_sql_port
kwdb_set_default_http_port

if [ "$KWDB_MODE" = "container" ]; then
  kwdb_ensure_container_ready
  echo "容器 $KWDB_CONTAINER_NAME 已运行，请确认容器内 KWDB 服务已启动，SQL 端口为 $KWDB_SQL_PORT"
  exit 0
fi

"$KWDB_KWBASE_BIN" start-single-node --insecure --listen-addr="$KWDB_SQL_HOST:$KWDB_SQL_PORT" --http-addr="$KWDB_SQL_HOST:$KWDB_HTTP_PORT" --store="$KWDB_HOST_STORE" --background
