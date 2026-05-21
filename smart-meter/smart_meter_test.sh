#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=smart-meter/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"
cd "$SCRIPT_DIR"

usage() {
  cat <<EOF
用法:
  bash smart_meter_test.sh [listen_port] [http_port] [store]
  bash smart_meter_test.sh --container <container_name> [--port container_sql_port] [--data-path local_data_path] [--container-store container_store]

说明:
  本机模式会启动 KWDB、解压数据、导入 rdb/tsdb 并执行查询。
  容器模式要求 KWDB 容器已经运行，会解压本地数据、复制到容器并执行导入和查询。
  导入过程会先删除示例库 rdb 和 tsdb，再重新导入。
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
echo "----准备智能电表示例数据----"
bash prepare_data.sh "$DATA_PATH"
echo "----导入 rdb/tsdb 数据----"
bash create_load.sh "$@"
echo "----执行智能电表场景查询----"
bash query.sh "$@"
