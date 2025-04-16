# 场景示例

## 查询区域用电量TOP10

```sql
SELECT 
  a.area_name,
  SUM(md.energy) AS total_energy
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.area_name
ORDER BY total_energy DESC
LIMIT 10;
```

执行结果：
```sql
root@26257/defaultdb> SELECT 
  a.area_name,
  SUM(md.energy) AS total_energy
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.area_name
ORDER BY total_energy DESC
LIMIT 10;

area_name       total energy
-----------------------
Area            5.556e+06
Area 1          5.5549e9e+06
Area            1.55398e+06
Area 99         5.55297e+06
Area 98         5.55196e+06
Area 97         5.55095e+06
Area 96         5.54994e+06
Area 95         5.54893e+06
Area 94         5.54792e+06
Area 93         5.5469e+06

(10 rows)
Time: 125.584312ms
```

## 查询故障电表及用户信息

```sql
SELECT 
  mi.meter_id,
  u.user_name,
  u.contact,
  a.area_name
FROM rdb.meter_info mi
JOIN rdb.user_info u ON mi.user_id = u.user_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
WHERE mi.status = 'Fault';
```

执行结果：
```
 meter_id | user_name | contact       | area_name 
----------+-----------+---------------+-----------
 M100     | User 113  | 800138001     | Area 1    
 ...（共5行）
```

## 电表概要查询

```sql
SELECT 
  mi.meter_id,
  mi.voltage_level,
  mi.status,
  u.user_name,
  a.area_name,
  (SELECT COUNT(*) 
   FROM tsdb.meter_data md 
   WHERE md.meter_id = mi.meter_id) AS data_points
FROM rdb.meter_info mi
JOIN rdb.user_info u ON mi.user_id = u.user_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
WHERE mi.meter_id = 'M1';
```

执行结果：
```sql
 meter_id | voltage_level | status | user_name | area_name | data_points 
----------+---------------+--------+-----------+-----------+-------------
 M1       | 380V          | Normal | User 2    | Area 2    | 101        
```

## 告警检测查询

```sql
SELECT 
  md.meter_id,
  md.ts,
  ar.rule_name,
  md.voltage,
  md.current,
  md.power
FROM tsdb.meter_data md
JOIN rdb.alarm_rules ar ON 1=1
WHERE (ar.metric = 'voltage' 
       AND ((ar.operator = '>' AND md.voltage < ar.threshold) 
            OR (ar.operator = '<' AND md.voltage > ar.threshold)))
   OR (ar.metric = 'current' AND md.current > ar.threshold)
   OR (ar.metric = 'power' AND md.power > ar.threshold)
ORDER BY md.ts DESC
LIMIT 100;
```

部分执行结果：
```sql
 meter_id |          ts          | rule_name  | voltage | current | power 
----------+-----------------------+------------+---------+---------+-------
 M2       | 2025-04-08 08:47:24+00| 高压告警    | 221     | 5.15    | 1050  
 ...（共100行）
```

## 区域用电量统计

```sql
SELECT 
  a.region,
  a.area_name,
  SUM(md.energy) AS total_energy,
  AVG(md.power) AS avg_power
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.region, a.area_name;
```

部分执行结果：
```sql
 region | area_name | total_energy | avg_power 
--------+-----------+--------------+-----------
 North  | Area 1    | 5.55499e+06  | 1950      
 West   | Area 100  | 5.55398e+06  | 1900      
 ...（共多行）
```

## 查询指定电表最近24小时用电趋势量

```sql
SELECT 
  md.ts,
  md.power,
  md.energy
FROM tsdb.meter_data md
WHERE md.meter_id = 'M1'
  AND md.ts > NOW() - INTERVAL '24 hours'
ORDER BY md.ts;
```

执行结果：
```sql
          ts          | power | energy 
----------------------+-------+--------
 2025-04-14 16:22:40+00 | 1000  | 6000   
```
