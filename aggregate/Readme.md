# 聚合函数

## 概述

聚合函数是 KWDB 时序查询的核心基础能力之一，用于对批量时序数据进行统计、计算、汇总，能够将多行传感器监测数据收敛为单一统计结果，完美适配工业物联网、设备监测、环境采集等时序数据分析场景。

本项目整理了一套可直接体验的聚合函数示例，覆盖**基础统计聚合**和**时序专属聚合**两大类，包含 10 种核心函数，全面满足设备数据统计、工况分析、稳定性评估、数据降采样等核心业务需求。

本项目旨在带领开发者快速体验 KWDB 聚合函数的标准用法与时序特色用法。

## 技术特点

KWDB 的聚合函数具备以下特点：

1. 支持标准 SQL 基础聚合（COUNT、AVG、SUM、MIN、MAX、STDDEV），兼容通用 SQL 使用习惯。
2. 提供时序专属聚合函数（FIRST、LAST、TWA、time_bucket），适配时序数据时间有序、非均匀采样特性。
3. 自动忽略 NULL 空值，适配传感器采集丢点、数据缺失等实际工业场景，确保统计结果准确。
4. 可单独使用，也可搭配 `GROUP BY` 实现按设备标签（ptag）、时间窗口分组聚合分析。
5. 支持字段算术运算后再聚合，满足复杂业务统计需求。

## 使用规则

1. 聚合函数用于 `SELECT` 子句，支持单列聚合、多列同时聚合、分组聚合。
2. 时序专属函数（FIRST、LAST、TWA）依赖时间戳列，自动基于时序排序计算。
3. `time_bucket()` 必须搭配 `GROUP BY` 使用，专用于时间窗口分桶聚合。
4. `TWA()` 必须指定时间戳列和数值列，适配非均匀采样时序数据。
5. 分组聚合时，`SELECT` 中的非聚合列必须出现在 `GROUP BY` 子句中。
6. 支持 `WHERE` 条件过滤数据后再进行聚合计算。

## 语法格式

```sql
-- 基础聚合（无分组）
SELECT aggregate_function(column_name)
FROM ts_table
[WHERE condition];

-- 分组聚合（按设备标签/时间窗口）
SELECT [group_column,] aggregate_function(column_name)
FROM ts_table
[WHERE condition]
GROUP BY [group_column];

aggregate_function: {
    COUNT(*) | COUNT(column_name)
  | AVG(column_name)
  | SUM(column_name)
  | MIN(column_name)
  | MAX(column_name)
  | STDDEV(column_name)
  | FIRST(column_name)
  | LAST(column_name)
  | TWA(ts_column, column_name)
  | time_bucket(ts_column, duration)
}
```

## 文件清单
``` text
aggregate/
    ├── start_service.sh   # 启动数据库单机服务脚本
    ├── create_load.sh     # 建库建表并导入测试数据
    ├── create_load.sql    # 建库建表与导入数据 SQL
    ├── query.sh           # 执行聚合函数示例查询
    ├── query.sql          # 聚合函数示例 SQL
    ├── aggregate_test.sh  # 一键体验脚本
    └── README.md          # 聚合函数示例说明文档
```

**注：本项目的脚本仅在 Linux 系统执行**

## 操作步骤
* 将 aggregate/ 目录中的脚本和 SQL 文件放到 KWDB 二进制目录下方
* 执行 start_service.sh 启动数据库单机服务 (如已启动请忽略本步骤)
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
> 注：如果启动时候 --listen-addr 服务监听端口以及 --http-addr admin UI 的端口被占用，需要重新指定，如：bash start_service.sh 11221 8008 ./kwbase-data12
* 执行 create_load.sh 建库、建表并导入测试数据
```bash
#!/bin/bash

DEFAULT_LISTEN_PORT="11223"
LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < create_load.sql
```
* 执行 query.sh 体验聚合函数查询
```bash
#!/bin/bash

DEFAULT_LISTEN_PORT="11223"
LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < query.sql
```
**Tips：可以直接执行 aggregate_test.sh 脚本，一键体验全流程**
## 表结构设计
本示例使用工业传感器监测场景，通过设备时序数据展示聚合函数的合适用法。
```sql
CREATE TS DATABASE sensors;

CREATE TABLE sensors.sensor_data (
  ts timestamp NOT NULL,
  normal_time timestamp NOT NULL,
  temperature smallint,
  temperature2 int,
  temperature3 bigint,
  stress float4,
  stress2 double
) TAGS (
  ptagID int NOT NULL
)
PRIMARY TAGS(ptagID);
```
字段说明：
1. ts：高精度时间戳主键，传感器数据采集时间。
2. normal_time：标准时间字段。
3. temperature/temperature2/temperature3：多类型温度监测值。
4. stress/stress2：多精度压力监测值。
5. ptagID：传感器编号，作为主标签，用于分组区分不同设备。
## 测试数据
项目内置 28 条标准化测试数据，包含正常数值、负数、NULL 空值等多种场景，覆盖聚合函数各类使用边界。
## 场景查询
本项目使用温度传感器数据来演示聚合函数。
```sql
样例表中的 29 条数据如下：
             ts             |        normal_time        | temperature | temperature2 | temperature3 | stress | stress2 | ptagid
----------------------------+---------------------------+-------------+--------------+--------------+--------+---------+---------
  2024-12-01 01:00:00+00:00 | 2024-12-01 01:00:00+00:00 |           1 |          100 |         1000 |    0.1 |    0.01 |      1
  2024-12-01 02:00:00+00:00 | 2024-12-01 02:00:00+00:00 |           2 |          200 |         2000 |    0.2 |    0.02 |      1
  2024-12-01 03:00:00+00:00 | 2024-12-01 03:00:00+00:00 |           3 |          300 |         3000 |    0.3 |    0.03 |      1
  2024-12-01 04:00:00+00:00 | 2024-12-01 04:00:00+00:00 |           4 |          400 |         4000 |    0.4 |    0.04 |      1
  2024-12-01 05:00:00+00:00 | 2024-12-01 05:00:00+00:00 |           5 |          500 |         5000 |    0.5 |    0.05 |      2
  2024-12-01 06:00:00+00:00 | 2024-12-01 06:00:00+00:00 |           6 |          600 |         6000 |    0.6 |    0.06 |      2
  2024-12-01 07:00:00+00:00 | 2024-12-01 07:00:00+00:00 |           7 |          700 |         7000 |    0.7 |    0.07 |      2
  2024-12-01 08:00:00+00:00 | 2024-12-01 08:00:00+00:00 |           8 |          800 |         8000 |    0.8 |    0.08 |      3
  2024-12-01 09:00:00+00:00 | 2024-12-01 09:00:00+00:00 |           9 |          900 |         9000 |    0.9 |    0.09 |      3
  2024-12-01 10:00:00+00:00 | 2024-12-01 10:00:00+00:00 |          10 |         1000 |        10000 |      1 |     0.1 |      3
  2024-12-01 11:00:00+00:00 | 2024-12-01 11:00:00+00:00 |          -1 |         -100 |        -1000 |   -0.1 |   -0.01 |      5
  2024-12-01 12:00:00+00:00 | 2024-12-01 12:00:00+00:00 |           2 |          200 |         2000 |    0.2 |    0.02 |      5
  2024-12-01 13:00:00+00:00 | 2024-12-01 13:00:00+00:00 |          -3 |         -300 |        -3000 |   -0.3 |   -0.03 |      5
  2024-12-01 14:00:00+00:00 | 2024-12-01 14:00:00+00:00 |           4 |          400 |         4000 |    0.4 |    0.04 |      5
  2024-12-01 15:00:00+00:00 | 2024-12-01 15:00:00+00:00 |          -5 |         -500 |        -5000 |   -0.5 |   -0.05 |      5
  2024-12-01 16:00:00+00:00 | 2024-12-01 16:00:00+00:00 |          -1 | NULL         |        -1000 | NULL   |   -0.01 |      6
  2024-12-01 16:00:01+00:00 | 2024-12-01 16:00:00+00:00 |          -1 | NULL         |        -1000 | NULL   |   -0.01 |      7
  2024-12-01 17:00:00+00:00 | 2024-12-01 17:00:00+00:00 | NULL        | NULL         |         2000 | NULL   | NULL    |      6
  2024-12-01 17:00:01+00:00 | 2024-12-01 17:00:00+00:00 | NULL        | NULL         |         2000 | NULL   | NULL    |      7
  2024-12-01 17:00:03+00:00 | 2024-12-01 17:00:00+00:00 | NULL        | NULL         |         2000 | NULL   | NULL    |      8
  2024-12-01 18:00:00+00:00 | 2024-12-01 18:00:00+00:00 |          -3 | NULL         |        -3000 | NULL   | NULL    |      6
  2024-12-01 18:00:01+00:00 | 2024-12-01 18:00:00+00:00 |          -3 | NULL         |        -3000 | NULL   | NULL    |      7
  2024-12-01 18:00:04+00:00 | 2024-12-01 18:00:00+00:00 |          -3 | NULL         |        -3000 | NULL   | NULL    |      8
  2024-12-01 19:00:00+00:00 | 2024-12-01 19:00:00+00:00 |           4 | NULL         |         NULL |    0.4 | NULL    |      6
  2024-12-01 19:00:01+00:00 | 2024-12-01 19:00:00+00:00 |           4 | NULL         |         NULL |    0.4 | NULL    |      7
  2024-12-01 19:00:05+00:00 | 2024-12-01 19:00:00+00:00 |           4 | NULL         |         NULL |    0.4 | NULL    |      8
  2024-12-01 20:00:01+00:00 | 2024-12-01 20:00:00+00:00 | NULL        | NULL         |         NULL |   -0.5 |   -0.05 |      6
  2024-12-01 20:00:02+00:00 | 2024-12-01 20:00:00+00:00 | NULL        | NULL         |         NULL |   -0.5 |   -0.05 |      7
  2024-12-01 20:00:06+00:00 | 2024-12-01 20:00:00+00:00 | NULL        | NULL         |         NULL |   -0.5 |   -0.05 |      8
(29 rows)
```
一、基础统计聚合函数
**1. COUNT () 计数聚合函数**
功能：统计数据行总数，自动忽略 NULL 值，用于设备数据量核查、上报完整性校验。示例：统计传感器 ptagID=3 的上报数据条数
```sql
SELECT COUNT(*) FROM sensor_data WHERE ptagid= 3;
```

**2. AVG () 平均值聚合函数**
功能：计算指定数值列算术平均值，自动忽略 NULL，适用于设备运行指标均值统计。示例：按传感器分组，统计各设备温度平均值
```sql
SELECT ptagid, AVG(temperature) FROM sensor_data GROUP BY ptagid;
```
**3. SUM () 求和聚合函数**
功能：对指定数值列累加求和，自动忽略 NULL，适用于压力、能耗等累计量统计。示例：统计所有传感器压力值累计总和
```sql
SELECT SUM(stress) FROM sensor_data WHERE ts > '2024-12-01';
```
**4. MIN () 最小值聚合函数**
功能：查询分组内指定列最小值，用于设备异常低点排查。示例：查询每个传感器温度最小值
```sql
SELECT ptagid, MIN(temperature) FROM sensor_data GROUP BY ptagid;
```
**5. MAX () 最大值聚合函数**
功能：查询分组内指定列最大值，用于设备超温、过载预警。示例：查询每个传感器温度最大值
```sql
SELECT ptagid, MAX(temperature) FROM sensor_data GROUP BY ptagid;
```
**6. STDDEV () 标准差聚合函数**
功能：计算数据波动程度，结合均值评估设备运行稳定性。示例：统计各传感器温度均值与标准差
```sql
SELECT ptagid, AVG(temperature), STDDEV(temperature) FROM sensor_data GROUP BY ptagid;
```
二、时序专属聚合函数
**1. FIRST () 时序首值函数**
功能：按时间戳升序，获取指定列第一条有效数据，用于设备初始值采集。示例：获取最早一条温度采集值
```sql
SELECT first(temperature) AS first_temp FROM sensor_data;
```
**2. LAST () 时序末值函数**
功能：按时间戳排序，获取指定列最后一条有效数据，用于实时工况监控。示例：获取最新上报温度值
```sql
SELECT last(temperature) AS last_temp FROM sensor_data;
```
**3. time_bucket () + LAST () 时间窗口降采样**
功能：按固定时间间隔分桶，搭配聚合函数实现高频数据降采样。示例：按 2 小时窗口，取每个窗口最后一条温度值
```sql
select time_bucket(ts, '2h') bucket, last(temperature) 
from sensor_data 
group by bucket 
order by bucket;
```
**4.  TWA () 时间加权平均值函数**
功能：时序专属加权均值，适配非均匀采样，统计结果比普通均值更精准。示例：计算温度时间加权平均值
```sql
-- 基础用法
SELECT twa(ts, temperature) FROM sensor_data;

-- 进阶用法：温度翻倍后加权平均
SELECT twa(ts, temperature * 2) FROM sensor_data;
```
## 总结
本文档涵盖 10 种核心聚合函数，分为基础统计和时序专属两大类，覆盖绝大多数时序数据统计场景。
所有示例基于统一的传感器测试环境，可一键部署、直接运行。
聚合函数支持条件过滤、分组聚合、运算后聚合，灵活适配工业物联网、设备监测等业务需求。
时序专属函数（FIRST、LAST、TWA、time_bucket）是 KWDB 区别于普通数据库的核心能力，专为时序数据优化。