# 窗口函数

## 概述

窗口函数是 KWDB 时序查询的重要能力之一，适用于按照时间、状态、事件、会话和固定行数对连续数据流进行切分，再对每个窗口分别进行聚合计算。

本项目整理了一套可直接体验的窗口函数示例，覆盖以下 5 类典型能力：

1. `TIME_WINDOW`：按固定时间间隔切分窗口。
2. `SESSION_WINDOW`：按相邻记录的最大连续时间间隔切分窗口。
3. `STATE_WINDOW`：按状态值变化切分窗口。
4. `EVENT_WINDOW`：按开始条件和结束条件切分窗口。
5. `COUNT_WINDOW`：按固定数据行数切分窗口，并支持滑动。

本项目旨在带领开发者快速体验 KWDB 的窗口函数。

## 技术特点

KWDB 的分组窗口查询具备以下特点：

1. 必须搭配 `GROUP BY` 使用，并对每个窗口分别输出聚合结果。
2. 适用于时序表单表查询，适合对设备时序数据做连续区间分析。
3. 支持时间窗口、会话窗口、状态窗口、事件窗口、计数窗口五种窗口模型，能覆盖大多数时序分析场景。

## 使用规则

1. 分组窗口函数仅用于时序表单表查询，不支持嵌套子查询、关联查询和联合查询。
2. 分组窗口函数必须出现在 `GROUP BY` 子句中，可单独使用，也可与主标签组合使用。
3. 表内单个设备的数据应按时间戳有序，且时间戳不应重复。
4. `SESSION_WINDOW` 的间隔参数支持 `s`、`m`、`h`、`d`、`w`，不支持 `1m2s` 这类复合时间格式。
5. `STATE_WINDOW` 适合直接作用于整型、布尔值和字符类型的状态列。
6. `COUNT_WINDOW` 的滑动值不能大于窗口行数，且必须为正整数。
7. `TIME_WINDOW` 支持设置滑动时间，但滑动时间不应大于窗口大小，且不建议与窗口大小差距过大。

## 语法格式

```sql
SELECT select_list
FROM ts_table
[WHERE condition]
GROUP BY [<ptag>,] group_window_function;

group_window_function: {
    COUNT_WINDOW(count_val[, sliding_val])
  | EVENT_WINDOW(start_trigger_condition, end_trigger_condition)
  | SESSION_WINDOW(ts_col, tol_val)
  | STATE_WINDOW(column_name)
  | TIME_WINDOW(ts_col, duration[, sliding_time])
}
```

## 文件清单

```text
window/
    ├── start_service.sh   # 启动数据库单机服务脚本
    ├── generate_data.sh   # 生成窗口函数示例数据
    ├── create_load.sh     # 建库建表并导入数据
    ├── create_load.sql    # 建库建表与导入数据 SQL
    ├── query.sh           # 执行窗口函数示例查询
    ├── query.sql          # 窗口函数示例 SQL
    ├── window_test.sh     # 一键体验脚本
    └── README.md          # 窗口函数示例说明文档
```

**注：本项目的脚本仅在 Linux 系统执行**

## 操作步骤

* 将 `window/` 目录中的脚本和 SQL 文件放到 KWDB 二进制目录下方
* 执行 `start_service.sh` 启动数据库单机服务(如已启动请忽略本步骤)

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_PORT="11223"
  DEFAULT_HTTP_PORT="8892"
  DEFAULT_STORE="./kwbase-data"

  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}
  HTTP_ADDR=${2:-$DEFAULT_HTTP_PORT}
  STORE=${3:-$DEFAULT_STORE}

  ./kwbase start-single-node --insecure --listen-addr=127.0.0.1:$LISTEN_ADDR --http-addr=127.0.0.1:$HTTP_ADDR --store=$STORE --background
  ```

  > 注：如果启动时候 `--listen-addr` 服务监听端口以及 `--http-addr` admin UI 的端口被占用的话，需要重新指定，如：`bash start_service.sh 11221 8008 ./kwbase-data12`，参数1是服务监听端口，参数2是 admin UI 端口，参数3是数据保存目录

* 执行 `generate_data.sh` 生成窗口函数示例数据

  可以指定数据目录，如 `bash generate_data.sh ./kwbase-data-demo`，该目录需要与 `start_service.sh` 的 `store` 参数保持一致

* 执行 `create_load.sh` 建库、建表并导入数据

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_PORT="11223"
  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

  ./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < create_load.sql
  ```

* 执行 `query.sh` 体验窗口函数查询

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_PORT="11223"
  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

  ./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < query.sql
  ```

**Tips：可以直接执行 `window_test.sh` 脚本，一键体验**

## 表结构设计

本示例使用交通流量分析场景，通过车辆时序数据展示窗口函数的合适用法。

```sql
CREATE TS DATABASE ts_window;

CREATE TABLE ts_window.vehicles (
  ts timestamp NOT NULL,
  vehicle_id varchar(16),
  speed float,
  lane_no int
) TAGS (
  location int NOT NULL
)
PRIMARY TAGS(location);
```

字段说明：

1. `ts`：时间戳主键，用于表示车辆经过检测点的时间。
2. `vehicle_id`：车辆编号。
3. `speed`：车速。
4. `lane_no`：车道号，可用于状态窗口划分。
5. `location`：检测点位置，作为ptag。

## 数据生成

示例数据来自时序查询手册中的 `vehicles` 表场景。`generate_data.sh` 会在数据目录下生成一份固定内容的 CSV 文件，方便直接复现窗口函数的示例结果。

最终生成文件路径如下：

```text
kwbase-data/extern/vehicles/vehicles.csv
```

## 数据导入

导入时序数据：

```sql
import into ts_window.vehicles CSV DATA ("nodelocal://1/vehicles");
```

## 场景查询

本项目使用交通流量监测场景来演示窗口函数。

样例表中的 6 条数据如下：

```sql
ts                       | vehicle_id | speed | lane_no | location
-------------------------+------------+-------+---------+---------
2025-01-10 12:01:00.000  | A11111     | 35    | 1       | 1
2025-01-10 12:02:00.000  | A22222     | 30    | 1       | 1
2025-01-10 12:09:00.000  | A33333     | 35    | 2       | 1
2025-01-10 12:11:00.000  | A44444     | 40    | 3       | 1
2025-01-10 12:12:00.000  | A55555     | 25    | 2       | 1
2025-01-10 12:21:00.000  | A66666     | 35    | 1       | 1
```

**场景一：** 使用 `COUNT_WINDOW` 按固定 3 条记录划分窗口，统计每个窗口内的记录数与平均车速

```sql
SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY COUNT_WINDOW(3);
```

**场景二：** 使用 `EVENT_WINDOW` 识别低速拥堵事件。当车速降到 30 以下时视为拥堵开始，当车速回升到 35 及以上时视为拥堵结束，统计每次拥堵事件的持续记录数和平均车速

```sql
SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY EVENT_WINDOW(speed < 30, speed >= 35);
```

**场景三：** 使用 `SESSION_WINDOW` 按 5 分钟最大连续间隔划分会话窗口

```sql
SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY SESSION_WINDOW(ts, '5m');
```

**场景四：** 使用 `STATE_WINDOW` 分析车流状态持续情况。将“是否处于低速状态”作为状态量，按状态变化切分连续区间，观察低速与非低速状态分别持续了多久

```sql
SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY STATE_WINDOW(CASE WHEN speed < 35 THEN 'low' ELSE 'high' END);
```

**场景五：** 使用 `TIME_WINDOW` 按 10 分钟固定时间窗口聚合车流数据

```sql
SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY TIME_WINDOW(ts, '10m');
```
