---
name: sampledb-quickstart
description: Interactively guide users through the KWDB SampleDB project demos. Use when users ask to quickly experience, run, test, demonstrate, or learn this repository's examples, including smart-meter, multi-mode, window functions, or aggregate functions, on either a local/bare-metal KWDB binary or a Docker/container KWDB deployment. This skill must inspect the environment, prepare or start KWDB, ask which example to run, ask before each step, explain every step and concept, offer both full query.sh and single-query demo options, summarize results, return to example selection, and clean up temporary kwbase-data directories when the user stops.
---

# SampleDB Quickstart

## Goal

Provide an interactive, educational SampleDB walkthrough. Do not silently run an entire demo. First check the project environment, then prepare a KWDB target, then ask the user which example they want, then ask before each step while explaining what it does.

## Available Examples

| Example | Directory | Step scripts | Concepts |
|---|---|---|---|
| Smart meter | `smart-meter/` | `prepare_data.sh`, `create_load.sh`, `query.sh` | relational + time-series import, cross-model analysis |
| Multi-mode | `multi-mode/` | `generate_data.sh`, `create_load.sh`, `query.sh` | cross-model joins between relational and time-series data |
| Window functions | `window/` | `generate_data.sh`, `create_load.sh`, `query.sh` | `COUNT_WINDOW`, `EVENT_WINDOW`, `SESSION_WINDOW`, `STATE_WINDOW`, `TIME_WINDOW` |
| Aggregate functions | `aggregate/` | `generate_data.sh`, `create_load.sh`, `query.sh` | `COUNT`, `AVG`, `SUM`, `MIN`, `MAX`, `STDDEV`, `FIRST`, `LAST`, `TWA`, `time_bucket` |

Do not default to `smart-meter`. After KWDB is ready, ask the user which example they want to try. If the user asks for a recommendation, explain the tradeoff and still ask them to choose:
- `smart-meter`: broadest end-to-end demo.
- `multi-mode`: focused cross-model query demo.
- `window`: focused time-series window function demo.
- `aggregate`: shortest statistics and time-bucket demo.

## Required Interaction Loop

Use this loop for every quickstart session:

1. **Check project environment.**
2. **Prepare or start KWDB.**
3. **Ask which example to run.**
4. **For the selected example, ask before each step and explain it.**
5. **For query steps, ask whether to run the full `query.sh` script or one single query example.**
6. **Summarize the example result.**
7. **Return to step 3 and ask which example to try next.**

Only stop the loop when the user says they are done, asks to stop, or a blocker requires user input. When stopping because the user chose `stop`, clean up the `kwbase-data` temporary directories created by this quickstart session before ending.

Track every temporary data directory you create during the session. Add a path to the cleanup list immediately after a successful data preparation or generation step. Do not add a pre-existing directory unless you created or overwrote it during this quickstart flow.

## Step 1: Check Project Environment

Run lightweight checks first:

```bash
pwd
git status --short
test -f smart-meter/prepare_data.sh && test -f smart-meter/create_load.sh && test -f smart-meter/query.sh
test -f multi-mode/generate_data.sh && test -f multi-mode/create_load.sh && test -f multi-mode/query.sh
test -f window/generate_data.sh && test -f window/create_load.sh && test -f window/query.sh
test -f aggregate/generate_data.sh && test -f aggregate/create_load.sh && test -f aggregate/query.sh
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}' | rg -i '(^REPOSITORY|kwdb)'
lsof -nP -iTCP:26257 -sTCP:LISTEN || true
lsof -nP -iTCP:8080 -sTCP:LISTEN || true
command -v kwbase || true
find . -maxdepth 3 -type f -name kwbase -perm -111 -print
```

Then summarize:
- current repository path,
- whether required example scripts exist,
- whether Docker is available,
- whether a KWDB container is running,
- whether host ports `26257` or `8080` already have listeners,
- whether a stopped KWDB container or local `kwbase` is available.

Keep a deployment context for the rest of the walkthrough:

| Field | Container mode | Host mode |
|---|---|---|
| mode | `container` | `host` |
| SQL target | container SQL host/port, usually `localhost:26257` inside the container | host/port, usually `127.0.0.1:11223` for scripts |
| KWDB executable | default `/kaiwudb/bin/kwbase` inside the container | detected `kwbase` path or `./kwbase` |
| import store | detected from the container process or supplied with `--container-store` | known local store path |
| step arguments | `--container <container> --port <port>` plus `--data-path` for imports | `--host <host> --port <port> --kwbase-bin <path>` |
| cleanup list | local example data dirs created under `<example>/kwbase-data` | host store `kwbase-data` only if this skill created it for the demo |

## Step 2: Prepare Or Start KWDB

### If A Running KWDB Exists

This includes running KWDB containers and likely host-mode KWDB listeners on ports such as `26257` or `8080`. Do not use it automatically. Ask the user first:

> 检测到已运行的 KWDB：`<name or host>`. 是否可以使用这个 KWDB 来体验 SampleDB？注意部分示例会删除并重建自己的演示库，例如 `rdb`、`tsdb`、`db_monitor`、`monitor_r`、`ts_window`、`sensors`。

If the user agrees, use it. If they decline, offer to start a separate demo container such as `sampledb-kwdb`. If default host ports are already occupied, explain the conflict and ask before choosing alternate port mappings.

For an approved running target:
- If it is a container, set deployment mode to `container`, record the container name, SQL port, and KWDB binary path. Let scripts auto-detect the container store unless detection fails.
- If it is a host listener, set deployment mode to `host`, but first identify or ask for the KWDB store path. Host-mode imports read `nodelocal://1/...` from the node's local store, so the data-generation step must write into that same store path. If the store path cannot be confirmed, explain that imports may fail and offer to start a separate demo container instead.

### If No KWDB Is Running

Start KWDB according to the available environment:

- If a stopped `sampledb-kwdb` container exists, start it instead of creating a new one:

```bash
docker start sampledb-kwdb
```

- Else if Docker image `kwdb/kwdb:latest` exists, start a demo container:

```bash
docker run -d --name sampledb-kwdb \
  -p 26257:26257 \
  -p 8080:8080 \
  kwdb/kwdb:latest \
  /kaiwudb/bin/kwbase start-single-node \
  --insecure \
  --listen-addr=0.0.0.0:26257 \
  --http-addr=0.0.0.0:8080 \
  --store=/kaiwudb/deploy/sampledb-kwdb
```

- Else if host `kwbase` exists, start host mode with an explicit shared store path:

```bash
bash smart-meter/start_service.sh --port 11223 --http-port 8892 --store kwbase-data --kwbase-bin <kwbase_path>
```

Use deployment mode `host`, SQL target `127.0.0.1:11223`, and host store `kwbase-data`. The same shared store path must be used by the selected example's data preparation step.

- If neither Docker image nor `kwbase` exists, explain what is missing and provide the command the user should run after installing or starting KWDB.

After starting or selecting KWDB, wait for readiness:

```bash
docker exec <container> /kaiwudb/bin/kwbase sql --insecure --host=localhost:26257 -e 'SELECT 1;'
<kwbase_path> sql --insecure --host=127.0.0.1:11223 -e 'SELECT 1;'
```

Use the readiness command that matches the deployment context. In container mode, scripts use `--container <container>` and automatically detect the KWDB store path when possible. In host mode, imports require the example data to be under the selected host store's `extern` directory.

## Step 3: Ask Which Example

After KWDB is ready, ask:

> 请选择要体验的示例：`smart-meter`、`multi-mode`、`window`、`aggregate`。也可以输入 `stop` 结束。

Do not run an example before the user answers. If the user enters `stop`, go to **Stop And Cleanup**. Do not ask which example to run again after `stop`.

## Step 4: Run The Selected Example Step By Step

Do not use the one-shot scripts (`smart_meter_test.sh`, `multi_test.sh`, `window_test.sh`, `aggregate_test.sh`) in the guided flow unless the user explicitly asks for one-click execution. Prefer the step scripts below so each step can be explained and confirmed.

For every step:
1. Say what the step will do.
2. Say which files/databases it touches.
3. Ask for confirmation before running.
4. Run the command only after confirmation.
5. Summarize the result.

When presenting a command, adapt it to the deployment context:

| Operation | Container mode | Host mode |
|---|---|---|
| Prepare/generate data | use a local path under the example, such as `<example>/kwbase-data` | use the host store path, such as `kwbase-data`, because `nodelocal://1/...` reads from the KWDB store |
| Import data | `bash <example>/create_load.sh --container <container> --port <port> --data-path <example>/kwbase-data` | `bash <example>/create_load.sh --host <host> --port <port> --kwbase-bin <kwbase_path>` |
| Query data | `bash <example>/query.sh --container <container> --port <port>` | `bash <example>/query.sh --host <host> --port <port> --kwbase-bin <kwbase_path>` |

Do not show only the generic template if you know the concrete deployment context. Replace `<container>`, `<port>`, `<host>`, `<kwbase_path>`, and data paths with actual values before asking for confirmation.

### Query Mode Selection

For the query step of every example, do not only offer `query.sh`. Present these choices and wait for the user:

- `all`: run the example's full `query.sh`, which executes every query in that example's `query.sql`.
- `single`: run one selected query example from `query.sql`.
- `skip`: skip queries and return to the example summary.

When offering `single`, list the available query examples for the current example with a short explanation of what each query demonstrates. Do not run any query until the user chooses one and confirms. For single-query execution, read the exact SELECT block from the example's `query.sql` and run only that SQL.

The single-query menu order below matches the order of SELECT statements in each `query.sql`. Preserve that mapping when extracting the selected SQL block.

Use stdin to run a selected SQL block without creating repository files:

```bash
# container mode
docker exec -i <container> <container_kwbase> sql --insecure --host=localhost:<port> <<'SQL'
<selected SQL from query.sql>
SQL

# host mode
<kwbase_path> sql --insecure --host=<host>:<port> <<'SQL'
<selected SQL from query.sql>
SQL
```

After a single query finishes, summarize what the result means, then ask whether the user wants another single query, the full `query.sh`, or to finish this example.

### Smart Meter

Step A: prepare data.

Explain: extracts `extern/rdb.tar.gz` and `extern/tsdb.tar.gz` into `kwbase-data/extern`. These are database-level CSV export packages.

```bash
bash smart-meter/prepare_data.sh smart-meter/kwbase-data
# host mode when the KWDB store is kwbase-data:
bash smart-meter/prepare_data.sh kwbase-data
```

Step B: import data.

Explain: copies `rdb` and `tsdb` into the container's KWDB `extern` directory and runs `IMPORT DATABASE`. This recreates demo databases `rdb` and `tsdb`.

```bash
bash smart-meter/create_load.sh --container <container> --data-path smart-meter/kwbase-data
# host mode:
bash smart-meter/create_load.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Step C: run scenarios.

Explain: the query phase can either run every query in `smart-meter/query.sql` or run one query example at a time. These queries cover row-count validation, cross-model joins, alert detection, time buckets, and window functions.

Single-query menu:
- `counts`: validates imported row counts for `rdb` metadata tables and `tsdb.meter_data`; use this first to confirm import success.
- `area-energy-ranking`: joins meter readings with meter and area metadata, then ranks areas by total energy consumption.
- `fault-meters`: joins relational metadata to list meters whose status is `Fault`, including user and area context.
- `meter-profile`: shows one meter's metadata plus its time-series sample count, demonstrating a correlated subquery.
- `alarm-detection`: joins meter measurements with alarm rules to find readings that violate configured thresholds.
- `region-area-summary`: aggregates energy and average power by region and area.
- `meter-recent-readings`: shows the latest 24 readings for meter `M1`.
- `hourly-power-bucket`: uses `time_bucket` to aggregate power statistics by meter and hour.
- `session-window`: groups continuous readings into sessions and summarizes energy.
- `state-window`: groups readings by high/low voltage state transitions.
- `event-window`: captures current spike events and summarizes peak current and average power.
- `count-window`: groups readings by count-based sliding windows.

Full-script command:

```bash
bash smart-meter/query.sh --container <container>
# host mode:
bash smart-meter/query.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Expected validation: `meter_info=100`, `user_info=100`, `area_info=100`, `alarm_rules=5`, `meter_data=10100`.

### Multi-mode

Step A: generate data.

Explain: creates CSV files for relational metadata tables and one time-series measurement table under `multi-mode/kwbase-data/extern`.

```bash
bash multi-mode/generate_data.sh multi-mode/kwbase-data
# host mode when the KWDB store is kwbase-data:
bash multi-mode/generate_data.sh kwbase-data
```

Step B: import data.

Explain: creates `db_monitor` time-series database and `monitor_r` relational database, then imports generated CSV files.

```bash
bash multi-mode/create_load.sh --container <container> --data-path multi-mode/kwbase-data
# host mode:
bash multi-mode/create_load.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Step C: run queries.

Explain: the query phase can either run every query in `multi-mode/query.sql` or run one query example at a time. These queries focus on cross-model joins between time-series measurements and relational metadata.

Single-query menu:
- `site-high-monitoring`: finds sites with more than three monitor values above 50, demonstrating filtering, grouping, `HAVING`, and metadata joins.
- `pipe-area-10s-bucket`: filters `Pipe_3` in selected areas and aggregates monitor values into 10-second buckets.
- `hourly-pipeline-region`: aggregates measurements by hour, region, and pipeline to demonstrate time-series rollups with relational dimensions.
- `pipe-area-5s-average`: calculates 5-second average monitor values for `Pipe_9` in `Area_7`.

Full-script command:

```bash
bash multi-mode/query.sh --container <container>
# host mode:
bash multi-mode/query.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Expected validation: `t_monitor_point=10000`, `site_info=436`, `region_info=41`, `pipeline_info=26`, `point_base_info=1500`, `operation_branch=8`.

### Window

Step A: generate data.

Explain: creates `vehicles.csv` with ordered vehicle detection records.

```bash
bash window/generate_data.sh window/kwbase-data
# host mode when the KWDB store is kwbase-data:
bash window/generate_data.sh kwbase-data
```

Step B: import data.

Explain: creates `ts_window.vehicles` and imports the CSV into a time-series table.

```bash
bash window/create_load.sh --container <container> --data-path window/kwbase-data
# host mode:
bash window/create_load.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Step C: run queries.

Explain: the query phase can either run every query in `window/query.sql` or run one query example at a time. These queries demonstrate how KWDB partitions ordered time-series records into different window types.

Single-query menu:
- `raw-vehicles`: shows the imported vehicle detection records ordered by timestamp.
- `count-window-fixed`: groups every 3 records with `COUNT_WINDOW(3)`.
- `count-window-sliding`: groups 3-record windows with a step of 2 using `COUNT_WINDOW(3, 2)`.
- `event-window`: starts a window when speed is below 30 and ends it when speed returns to at least 35.
- `session-window`: groups records separated by less than 5 minutes into the same session.
- `state-window`: groups consecutive records by derived speed state: `low` or `high`.
- `time-window-fixed`: groups records into fixed 10-minute windows.
- `time-window-sliding`: groups records into 10-minute windows that slide every 5 minutes.

Full-script command:

```bash
bash window/query.sh --container <container>
# host mode:
bash window/query.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Expected validation: `vehicles=6`.

### Aggregate

Step A: generate data.

Explain: creates `sensors.csv` with numeric sensor values and NULLs for aggregation edge cases.

```bash
bash aggregate/generate_data.sh aggregate/kwbase-data
# host mode when the KWDB store is kwbase-data:
bash aggregate/generate_data.sh kwbase-data
```

Step B: import data.

Explain: creates `sensors.sensor_data` and imports time-series sensor data.

```bash
bash aggregate/create_load.sh --container <container> --data-path aggregate/kwbase-data
# host mode:
bash aggregate/create_load.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Step C: run queries.

Explain: the query phase can either run every query in `aggregate/query.sql` or run one query example at a time. These queries demonstrate basic aggregation, time-series aggregation, `time_bucket`, and time-weighted average.

Single-query menu:
- `raw-sensors`: shows the imported sensor records ordered by timestamp.
- `count-by-tag`: counts rows for primary tag `ptagid = 3`.
- `avg-temperature`: calculates average temperature by primary tag.
- `sum-stress-after-date`: sums stress values after `2024-12-01`.
- `min-temperature`: finds the minimum temperature by primary tag.
- `max-temperature`: finds the maximum temperature by primary tag.
- `avg-stddev-temperature`: compares average and standard deviation by primary tag.
- `first-temperature`: returns the first temperature value in time order.
- `last-temperature`: returns the last temperature value in time order.
- `bucket-last-temperature`: uses `time_bucket` to group readings into 2-hour buckets and returns the last temperature per bucket.
- `twa-temperature`: calculates time-weighted average temperature.
- `twa-expression`: calculates time-weighted average over an expression, `temperature * 2`.

Full-script command:

```bash
bash aggregate/query.sh --container <container>
# host mode:
bash aggregate/query.sh --host <host> --port <port> --kwbase-bin <kwbase_path>
```

Expected validation: `sensor_data=29`.

## Step 5: Summarize And Return To Selection

After an example finishes:

1. Summarize which deployment mode was used.
2. Summarize import status and expected row counts.
3. Summarize which KWDB concepts were demonstrated.
4. Keep the local `kwbase-data` temporary directory on the cleanup list for the final stop cleanup.
5. Ask which example the user wants to try next, returning to Step 3.

## Stop And Cleanup

When the user chooses `stop` from the example selection prompt:

1. Explain that the demo is ending and that you will clean only the `kwbase-data` temporary directories created during this quickstart session.
2. Show the cleanup list before deleting anything.
3. Remove those directories.
4. Summarize what was removed and what was intentionally left running.

Use `rm -rf` only for paths in the tracked cleanup list, and only when the path name is exactly `kwbase-data` or ends with `/kwbase-data`. Never delete arbitrary paths, repository roots, parent directories, or a directory that was not created by this session.

Container-mode examples usually create local temporary directories such as:

```bash
rm -rf smart-meter/kwbase-data
rm -rf multi-mode/kwbase-data
rm -rf window/kwbase-data
rm -rf aggregate/kwbase-data
```

Host mode may use a shared KWDB store such as `kwbase-data`. If this skill started host-mode KWDB with `--store kwbase-data`, stop and explain before deleting the store if KWDB is still using it. Do not delete a running KWDB store. If KWDB has been stopped or the store is no longer in use, clean it only if it was created by this quickstart session:

```bash
rm -rf kwbase-data
```

Do not stop or remove an existing user-provided KWDB container during cleanup unless the user explicitly asks. If this skill created a dedicated demo container such as `sampledb-kwdb`, ask separately before stopping or removing that container; container lifecycle cleanup is distinct from local `kwbase-data` directory cleanup.

## Explanation Requirements

Keep explanations short and concrete. For each step, cover:

- command to run,
- reason for the step,
- touched files/databases,
- success criteria,
- relevant KWDB concept.

Core knowledge points:

- **KWDB store and `extern`**: `nodelocal://1/...` imports read files from the first node's local import directory under the store.
- **Temporary `kwbase-data` directories**: example scripts write import files under `kwbase-data/extern`; these files are useful only during the demo and should be removed when the user stops the walkthrough.
- **Relational vs time-series**: relational tables store entity metadata; time-series tables store timestamped measurements with tags/primary tags.
- **Cross-model query**: joins combine relational metadata with time-series measurements in one SQL query.
- **Aggregation and `time_bucket`**: aggregate raw measurements into statistics and time buckets.
- **Window functions**: segment ordered time-series data by count, event, session, state, or time.
- **Repeatable demos**: import scripts may drop demo databases before import to avoid conflicts.

## Failure Handling

Do not blindly retry failed imports or starts. On failure:

1. Show the failing command.
2. Read the last relevant lines of output/log.
3. Explain the likely cause.
4. Stop and ask for user direction if the fix would delete data, change ports, restart containers, or reuse an existing KWDB.

Common causes:

- Existing KWDB detected but not approved by user.
- Container not running.
- Docker image missing.
- Wrong `kwbase` path: use `--container-kwbase`.
- Wrong store path: use `--container-store`.
- Existing demo database conflict.
- Missing `smart-meter/extern/rdb.tar.gz` or `smart-meter/extern/tsdb.tar.gz`.
