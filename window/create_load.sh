#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=window/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"

usage() {
  cat <<EOF
用法:
  bash create_load.sh [listen_port]
  bash create_load.sh [--port listen_port] [--host host] [--kwbase-bin kwbase_path]
  bash create_load.sh --container <container_name> [--port container_sql_port] [--data-path local_data_path] [--container-store container_store]

说明:
  容器模式会先将 local_data_path/extern/vehicles 复制到容器的 container_store/extern/vehicles，
  再执行 create_load.sql 导入 nodelocal://1/vehicles 数据。
EOF
}

kwdb_parse_options "$@"

if [ "$KWDB_SHOW_HELP" = "1" ]; then
  usage
  exit 0
fi

kwdb_apply_positional_port

if [ "$KWDB_MODE" = "container" ]; then
  kwdb_copy_window_data_to_container
fi

kwdb_run_sql_file "$SCRIPT_DIR/create_load.sql"
