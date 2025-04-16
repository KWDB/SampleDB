# 表结构设计

请在 KWDB 中执行以下 SQL 语句创建表结构。

## 普通表结构

### 电表基础信息表(普通表)

```sql
CREATE TABLE rdb.meter_info(
  meter_id VARCHAR(50) PRIMARY KEY,
  install_date DATE,
  voltage_level VARCHAR(20),
  manufacturer VARCHAR(50),
  status VARCHAR(20),
  area_id VARCHAR(20),
  user_id VARCHAR(50)
);
```

### 用户信息表(普通表)

```sql
CREATE TABLE rdb.user_info(
  user_id VARCHAR(50) PRIMARY KEY,
  user_name VARCHAR(100),
  address VARCHAR(200),
  contact VARCHAR(20)
);
```

### 区域信息表(普通表)

```sql
CREATE TABLE rdb.area_info(
  area_id VARCHAR(20) PRIMARY KEY,
  area_name VARCHAR(100),
  manager VARCHAR(50),
  region VARCHAR(50)
);
```

## 时序表结构

### 实时用电数据表(时序表)

```sql
CREATE TABLE tsdb.meter_data(
  ts TIMESTAMPTZ(3) NOT NULL,
  voltage FLOAT8 NULL,
  current FLOAT8 NULL,
  power FLOAT8 NULL,
  energy FLOAT8 NULL,
  meter_id VARCHAR(50)
) TAGS(meter_id VARCHAR(50) NOT NULL)
PRIMARY TAGS(meter_id)
retentions 0s
activetime 1d
partition interval 10d;
```

## 告警规则表结构

```sql
CREATE TABLE rdb.alarm_rules(
  rule_id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100),
  metric VARCHAR(50),
  operator VARCHAR(10),
  threshold FLOAT8,
  severity VARCHAR(20),
  notify_method VARCHAR(50)
);
```
