#!/bin/bash

# shellcheck disable=SC2034

KWDB_DEFAULT_HOST_PORT="11223"
KWDB_DEFAULT_HOST_HTTP_PORT="8892"
KWDB_DEFAULT_HOST_STORE="./kwbase-data"
KWDB_DEFAULT_SQL_HOST="127.0.0.1"
KWDB_DEFAULT_CONTAINER_PORT="26257"
KWDB_DEFAULT_CONTAINER_HTTP_PORT="8080"
KWDB_DEFAULT_CONTAINER_SQL_HOST="localhost"
KWDB_DEFAULT_CONTAINER_STORE="/kwdb-data"
KWDB_DEFAULT_CONTAINER_KWBASE="/kaiwudb/bin/kwbase"
KWDB_DEFAULT_LOCAL_DATA_PATH="kwbase-data"
KWDB_DEFAULT_KWBASE_BIN="./kwbase"

kwdb_die() {
  echo "错误: $*" >&2
  exit 1
}

kwdb_require_cmd() {
  command -v "$1" >/dev/null 2>&1 || kwdb_die "未找到命令: $1"
}

kwdb_require_value() {
  if [ "$#" -lt 2 ] || [ -z "$2" ]; then
    kwdb_die "$1 需要参数"
  fi
}

kwdb_init_options() {
  KWDB_MODE="host"
  KWDB_SHOW_HELP="0"
  KWDB_SQL_HOST="${KWDB_SQL_HOST:-$KWDB_DEFAULT_SQL_HOST}"
  KWDB_SQL_PORT=""
  KWDB_SQL_PORT_SET="0"
  KWDB_HTTP_PORT=""
  KWDB_HTTP_PORT_SET="0"
  KWDB_HOST_STORE="${KWDB_HOST_STORE:-$KWDB_DEFAULT_HOST_STORE}"
  KWDB_CONTAINER_NAME="${KWDB_CONTAINER_NAME:-}"
  KWDB_CONTAINER_SQL_HOST="${KWDB_CONTAINER_SQL_HOST:-$KWDB_DEFAULT_CONTAINER_SQL_HOST}"
  KWDB_CONTAINER_STORE="${KWDB_CONTAINER_STORE:-$KWDB_DEFAULT_CONTAINER_STORE}"
  KWDB_CONTAINER_STORE_SET="0"
  KWDB_CONTAINER_KWBASE="${KWDB_CONTAINER_KWBASE:-$KWDB_DEFAULT_CONTAINER_KWBASE}"
  KWDB_LOCAL_DATA_PATH="${KWDB_LOCAL_DATA_PATH:-$KWDB_DEFAULT_LOCAL_DATA_PATH}"
  KWDB_KWBASE_BIN="${KWDB_KWBASE_BIN:-${KWBASE_BIN:-$KWDB_DEFAULT_KWBASE_BIN}}"
  KWDB_POSITIONAL=()
}

kwdb_parse_options() {
  kwdb_init_options

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        KWDB_SHOW_HELP="1"
        shift
        ;;
      -c|--container)
        kwdb_require_value "$@"
        KWDB_MODE="container"
        KWDB_CONTAINER_NAME="$2"
        shift 2
        ;;
      -p|--port)
        kwdb_require_value "$@"
        KWDB_SQL_PORT="$2"
        KWDB_SQL_PORT_SET="1"
        shift 2
        ;;
      --http-port)
        kwdb_require_value "$@"
        KWDB_HTTP_PORT="$2"
        KWDB_HTTP_PORT_SET="1"
        shift 2
        ;;
      --host)
        kwdb_require_value "$@"
        KWDB_SQL_HOST="$2"
        shift 2
        ;;
      --store)
        kwdb_require_value "$@"
        KWDB_HOST_STORE="$2"
        shift 2
        ;;
      --kwbase-bin)
        kwdb_require_value "$@"
        KWDB_KWBASE_BIN="$2"
        shift 2
        ;;
      --container-host)
        kwdb_require_value "$@"
        KWDB_CONTAINER_SQL_HOST="$2"
        shift 2
        ;;
      --container-store)
        kwdb_require_value "$@"
        KWDB_CONTAINER_STORE="$2"
        KWDB_CONTAINER_STORE_SET="1"
        shift 2
        ;;
      --container-kwbase)
        kwdb_require_value "$@"
        KWDB_CONTAINER_KWBASE="$2"
        shift 2
        ;;
      --data-path)
        kwdb_require_value "$@"
        KWDB_LOCAL_DATA_PATH="$2"
        shift 2
        ;;
      --)
        shift
        while [ "$#" -gt 0 ]; do
          KWDB_POSITIONAL+=("$1")
          shift
        done
        ;;
      -*)
        kwdb_die "未知参数: $1"
        ;;
      *)
        KWDB_POSITIONAL+=("$1")
        shift
        ;;
    esac
  done
}

kwdb_apply_positional_port() {
  if [ "$KWDB_SQL_PORT_SET" = "0" ] && [ "${#KWDB_POSITIONAL[@]}" -gt 0 ]; then
    KWDB_SQL_PORT="${KWDB_POSITIONAL[0]}"
  fi
}

kwdb_apply_positional_http_port() {
  if [ "$KWDB_HTTP_PORT_SET" = "0" ] && [ "${#KWDB_POSITIONAL[@]}" -gt 1 ]; then
    KWDB_HTTP_PORT="${KWDB_POSITIONAL[1]}"
  fi
}

kwdb_apply_positional_store() {
  if [ "${#KWDB_POSITIONAL[@]}" -gt 2 ]; then
    if [ "$KWDB_MODE" = "container" ]; then
      KWDB_CONTAINER_STORE="${KWDB_POSITIONAL[2]}"
      KWDB_CONTAINER_STORE_SET="1"
    else
      KWDB_HOST_STORE="${KWDB_POSITIONAL[2]}"
    fi
  fi
}

kwdb_set_default_sql_port() {
  if [ -z "$KWDB_SQL_PORT" ]; then
    if [ "$KWDB_MODE" = "container" ]; then
      KWDB_SQL_PORT="$KWDB_DEFAULT_CONTAINER_PORT"
    else
      KWDB_SQL_PORT="$KWDB_DEFAULT_HOST_PORT"
    fi
  fi
}

kwdb_set_default_http_port() {
  if [ -z "$KWDB_HTTP_PORT" ]; then
    if [ "$KWDB_MODE" = "container" ]; then
      KWDB_HTTP_PORT="$KWDB_DEFAULT_CONTAINER_HTTP_PORT"
    else
      KWDB_HTTP_PORT="$KWDB_DEFAULT_HOST_HTTP_PORT"
    fi
  fi
}

kwdb_ensure_container_ready() {
  kwdb_require_cmd docker

  if [ -z "$KWDB_CONTAINER_NAME" ]; then
    kwdb_die "请通过 --container 指定 KWDB 容器名称"
  fi

  if ! docker inspect "$KWDB_CONTAINER_NAME" >/dev/null 2>&1; then
    kwdb_die "容器不存在: $KWDB_CONTAINER_NAME"
  fi

  local running
  running=$(docker inspect -f '{{.State.Running}}' "$KWDB_CONTAINER_NAME" 2>/dev/null || true)
  if [ "$running" != "true" ]; then
    kwdb_die "容器未运行: $KWDB_CONTAINER_NAME"
  fi
}

kwdb_sql_target() {
  if [ "$KWDB_MODE" = "container" ]; then
    printf '%s:%s' "$KWDB_CONTAINER_SQL_HOST" "$KWDB_SQL_PORT"
  else
    printf '%s:%s' "$KWDB_SQL_HOST" "$KWDB_SQL_PORT"
  fi
}

kwdb_normalize_store_path() {
  local store_path="$1"

  store_path="${store_path#path=}"
  store_path="${store_path%%,*}"
  printf '%s' "$store_path"
}

kwdb_detect_container_store() {
  local cmdline
  local token

  kwdb_ensure_container_ready
  cmdline=$(docker exec "$KWDB_CONTAINER_NAME" sh -lc 'for cmdline in /proc/[0-9]*/cmdline; do tr "\000" " " < "$cmdline" 2>/dev/null | grep -m 1 "kwbase .*start" && break; done' 2>/dev/null || true)

  for token in $cmdline; do
    case "$token" in
      --store=*)
        kwdb_normalize_store_path "${token#--store=}"
        return 0
        ;;
    esac
  done

  return 1
}

kwdb_resolve_container_store() {
  local detected_store

  if [ "$KWDB_CONTAINER_STORE_SET" = "1" ]; then
    printf '%s' "$KWDB_CONTAINER_STORE"
    return 0
  fi

  detected_store=$(kwdb_detect_container_store || true)
  if [ -n "$detected_store" ]; then
    KWDB_CONTAINER_STORE="$detected_store"
  fi

  printf '%s' "$KWDB_CONTAINER_STORE"
}

kwdb_run_sql_file() {
  local sql_file="$1"

  if [ ! -f "$sql_file" ]; then
    kwdb_die "SQL 文件不存在: $sql_file"
  fi

  kwdb_set_default_sql_port

  if [ "$KWDB_MODE" = "container" ]; then
    kwdb_ensure_container_ready
    docker exec -i "$KWDB_CONTAINER_NAME" "$KWDB_CONTAINER_KWBASE" sql --insecure --host="$(kwdb_sql_target)" < "$sql_file"
  else
    "$KWDB_KWBASE_BIN" sql --insecure --host="$(kwdb_sql_target)" < "$sql_file"
  fi
}

kwdb_copy_aggregate_data_to_container() {
  local data_path="${KWDB_LOCAL_DATA_PATH%/}"
  local source_dir="$data_path/extern/sensors"
  local target_store
  target_store=$(kwdb_resolve_container_store)
  target_store="${target_store%/}"

  if [ ! -d "$source_dir" ]; then
    kwdb_die "未找到示例数据目录: $source_dir，请先执行 generate_data.sh 或通过 --data-path 指定数据目录"
  fi

  kwdb_ensure_container_ready
  docker exec "$KWDB_CONTAINER_NAME" mkdir -p "$target_store/extern"
  docker cp "$source_dir" "$KWDB_CONTAINER_NAME:$target_store/extern/"
}
