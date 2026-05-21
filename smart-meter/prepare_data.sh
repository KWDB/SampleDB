#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=smart-meter/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"

usage() {
  cat <<EOF
用法:
  bash prepare_data.sh [data_path]
  bash prepare_data.sh --data-path data_path

说明:
  将 smart-meter/extern/rdb.tar.gz 和 tsdb.tar.gz 解压到 data_path/extern 下。
EOF
}

kwdb_parse_options "$@"

if [ "$KWDB_SHOW_HELP" = "1" ]; then
  usage
  exit 0
fi

if [ "${#KWDB_POSITIONAL[@]}" -gt 0 ]; then
  KWDB_LOCAL_DATA_PATH="${KWDB_POSITIONAL[0]}"
fi

RDB_ARCHIVE="$SCRIPT_DIR/extern/rdb.tar.gz"
TSDB_ARCHIVE="$SCRIPT_DIR/extern/tsdb.tar.gz"
OUTPUT_PATH="${KWDB_LOCAL_DATA_PATH%/}"
OUTPUT_EXTERN="$OUTPUT_PATH/extern"

if [ ! -f "$RDB_ARCHIVE" ]; then
  kwdb_die "数据包不存在: $RDB_ARCHIVE"
fi

if [ ! -f "$TSDB_ARCHIVE" ]; then
  kwdb_die "数据包不存在: $TSDB_ARCHIVE"
fi

mkdir -p "$OUTPUT_EXTERN"
rm -rf "$OUTPUT_EXTERN/rdb" "$OUTPUT_EXTERN/tsdb"
tar -xzf "$RDB_ARCHIVE" -C "$OUTPUT_EXTERN"
tar -xzf "$TSDB_ARCHIVE" -C "$OUTPUT_EXTERN"

echo "成功准备智能电表示例数据，输出到 $OUTPUT_EXTERN"
