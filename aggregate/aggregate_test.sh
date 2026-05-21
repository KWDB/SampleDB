#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=aggregate/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"
cd "$SCRIPT_DIR"

usage() {
  cat <<EOF
用法:
  bash aggregate_test.sh [listen_port] [http_port] [store]
  bash aggregate_test.sh --container <container_name> [--port container_sql_port] [--data-path local_data_path] [--container-store container_store]

说明:
  本机模式会启动 KWDB、生成数据、建表导入并执行查询。
  容器模式要求 KWDB 容器已经运行，会生成本地数据、复制到容器并执行建表导入和查询。
EOF
}

kwdb_parse_options "$@"

if [ "$KWDB_SHOW_HELP" = "1" ]; then
  usage
  exit 0
fi

kwdb_apply_positional_store

if [ "$KWDB_MODE" = "container" ]; then
  DATA_PATH="$KWDB_LOCAL_DATA_PATH"
else
  DATA_PATH="$KWDB_HOST_STORE"
fi

echo "----启动数据库服务----"
bash start_service.sh "$@"
echo "----生成聚合函数示例数据----"
bash generate_data.sh "$DATA_PATH"
echo "----建表与导入数据----"
bash create_load.sh "$@"
echo "----执行聚合函数查询----"
bash query.sh "$@"
