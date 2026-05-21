# 智能电表

## 文件清单

```text
smart-meter/
    ├── start_service.sh    # 启动数据库单机服务脚本
    ├── prepare_data.sh     # 解压 rdb/tsdb 示例数据
    ├── create_load.sh      # 导入 rdb/tsdb 数据
    ├── create_load.sql     # 数据导入 SQL
    ├── query.sh            # 执行智能电表场景查询
    ├── query.sql           # 智能电表场景 SQL
    ├── kwdb_common.sh      # 本机与容器模式公共函数
    ├── smart_meter_test.sh # 一键体验脚本
    ├── extern/             # rdb.tar.gz 与 tsdb.tar.gz 数据包
    ├── table-schema.md     # 表结构设计
    ├── scenario.md         # 场景示例
    └── README.md           # 智能电表示例说明文档
```

**注：脚本依赖 Bash。本机部署模式适用于 Linux 环境；容器部署模式依赖 Docker CLI，并要求 KWDB 容器已经运行。**

## 表结构设计

您可以在[表结构设计](./table-schema.md)中查看智能电表模型的表设计。

## 导入数据

### 本机部署模式

* 将 `smart-meter/` 目录中的脚本、SQL 文件和 `extern/` 数据包放到 KWDB 二进制目录下方。
* 执行 `start_service.sh` 启动数据库单机服务（如已启动请忽略本步骤）。

  ```bash
  bash start_service.sh
  ```

  > 注：如果 `--listen-addr` 服务监听端口以及 `--http-addr` admin UI 端口被占用，需要重新指定，如：`bash start_service.sh 11221 8008 ./kwbase-data12`，参数1是服务监听端口，参数2是 admin UI 端口，参数3是数据保存目录。

* 执行 `prepare_data.sh`，将 `rdb.tar.gz` 和 `tsdb.tar.gz` 解压到本地数据目录的 `extern` 下。

  ```bash
  bash prepare_data.sh ./kwbase-data
  ```

> `rdb.tar.gz` 和 `tsdb.tar.gz` 文件存放在 [extern](./extern/) 目录下，您可自行下载后解压到 `extern` 目录下。

* 执行 `create_load.sh` 导入 `rdb` 和 `tsdb` 数据。

  ```bash
  bash create_load.sh
  ```

  > 注：`create_load.sql` 会先删除示例库 `rdb`、`tsdb`，再重新导入数据，便于重复执行一键体验。

* 执行 `query.sh` 体验智能电表场景查询。

  ```bash
  bash query.sh
  ```

**Tips：可以直接执行 `smart_meter_test.sh` 脚本，一键体验全流程。**

```bash
bash smart_meter_test.sh
```

### 容器部署模式

适用于 KWDB 已经通过 Docker 容器部署并运行的场景。容器模式会：

1. 将 `extern/rdb.tar.gz` 和 `extern/tsdb.tar.gz` 解压到本地数据目录。
2. 通过 `docker cp` 将本地生成的 `extern/rdb` 和 `extern/tsdb` 复制到容器内 KWDB 数据目录。
3. 通过 `docker exec` 调用容器内的 `kwbase sql` 执行数据导入与场景查询。

默认参数如下：

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `--port` | `26257` | 容器内 KWDB SQL 端口 |
| `--container-store` | 自动识别 `kwbase start` 的 `--store`，识别失败时使用 `/kwdb-data` | 容器内 KWDB 数据目录 |
| `--container-kwbase` | `/kaiwudb/bin/kwbase` | 容器内 `kwbase` 路径 |
| `--data-path` | `kwbase-data` | 本地解压示例数据的目录 |

如果使用默认参数，可以直接执行：

```bash
cd smart-meter
bash smart_meter_test.sh --container <kwdb_container_name>
```

如果容器内端口、数据目录或 `kwbase` 路径不同，可以显式指定：

```bash
bash smart_meter_test.sh \
  --container <kwdb_container_name> \
  --port 26257 \
  --container-store /kwdb-data \
  --container-kwbase /kaiwudb/bin/kwbase \
  --data-path ./kwbase-data
```

> 注：容器模式不会创建或启动 Docker 容器，请先使用项目实际的 KWDB 镜像启动容器，并确认容器内 KWDB 服务已可用。

## 准备数据

### 关系库 rdb

导入 rdb 数据

```sql
import database csv data ("nodelocal://1/rdb");
```

```sql
        job_id        |  status   | fraction_completed | rows | abandon_rows | reject_rows | note
----------------------+-----------+--------------------+------+--------------+-------------+-------
  1064039269816729601 | succeeded |                  1 |  305 | 0            | 0           | None
(1 row)
```

关系库导入验证：
```sql
root@127.0.0.1:26257/rdb> show tables;
  table_name  | table_type
--------------+-------------
  alarm_rules | BASE TABLE
  area_info   | BASE TABLE
  meter_info  | BASE TABLE
  user_info   | BASE TABLE
(4 rows)

Time: 2.971167ms
```

### 时序库 tsdb

导入 tsdb 数据
```sql
import database csv data ("nodelocal://1/tsdb");
```

```sql
  job_id |  status   | fraction_completed | rows  | abandon_rows | reject_rows | note
---------+-----------+--------------------+-------+--------------+-------------+-------
  -      | succeeded |                  1 | 10100 | 0            | 0           | None
(1 row)

Time: 240.805ms
```

时序库导入验证：

```sql
root@127.0.0.1:26257/tsdb> show tables;
  table_name |    table_type
-------------+--------------------
  meter_data | TIME SERIES TABLE
(1 row)

Time: 3.142458ms
```

### 时序数据生成语句

若想插入任意条数据可修改下面示例中的 `generate_series(1, 10000)` 中的数字，代表插入的条数。

以下示例为 10000 条数据：
```sql
INSERT INTO tsdb.meter_data(ts, voltage, current, power, energy, meter_id)
SELECT 
  NOW()-(s*10)::int * INTERVAL '1 minute',
  220.0 + (s%10)::float,
  5.0 + (s%15)::float * 0.1,
  1000.0 + (s%20)::float * 50,
  5000.0 + s::float * 10,
  'M' || ((s%100)+1)::text
FROM generate_series(1, 10000) AS s;
```

## 场景示例

完成数据准备后，请查看[场景示例](./scenario.md)中的内容，执行其中的 SQL 语句，验证相应场景。

- [查询区域用电量TOP10](./scenario.md#查询区域用电量top10)  
- [查询故障电表及用户信息](./scenario.md#查询故障电表及用户信息)  
- [电表概要查询](./scenario.md#电表概要查询)  
- [告警检测查询](./scenario.md#告警检测查询)  
- [区域用电量统计](./scenario.md#区域用电量统计)  
- [查询指定电表最近24小时用电趋势量](./scenario.md#查询指定电表最近24小时用电趋势量)
- [分时负荷统计](./scenario.md#分时负荷统计)
- [用电会话分析](./scenario.md#用电会话分析)
- [电压状态持续分析](./scenario.md#电压状态持续分析)
- [异常电流事件识别](./scenario.md#异常电流事件识别)
- [滑动采样趋势分析](./scenario.md#滑动采样趋势分析)
