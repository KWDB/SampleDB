#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=smart-meter/kwdb_common.sh
source "$SCRIPT_DIR/kwdb_common.sh"

usage() {
  cat <<EOF
用法:
  bash query.sh [listen_port]
  bash query.sh [--port listen_port] [--host host] [--kwbase-bin kwbase_path]
  bash query.sh --container <container_name> [--port container_sql_port]
EOF
}

kwdb_parse_options "$@"

if [ "$KWDB_SHOW_HELP" = "1" ]; then
  usage
  exit 0
fi

kwdb_apply_positional_port
kwdb_run_sql_file "$SCRIPT_DIR/query.sql"
