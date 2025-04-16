# 智能电表

## 表结构设计

您可以在[表结构设计](./table-schema.md)中查看智能电表模型的表设计。

## 导入数据

在数据库数据目录创建 `extern` 目录，将 `rdb.tar.gz` 和 `tsdb.tar.gz` 解压到 `extern` 目录下。

> `rdb.tar.gz` 和 `tsdb.tar.gz` 文件存放在 [extern](./extern/) 目录下，您可自行下载后解压到 `extern` 目录下。

操作步骤：
```bash
cd /data/kaiwudb
mkdir extern
tar xvf rdb.tar.gz
tar xvf tsdb.tar.gz
```

## 准备数据

### 关系库 rdb

导入 rdb 数据

```sql
import database csv data ("nodelocal://1/rdb")；
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
