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
root@127.0.0.1:26257/defaultdb> SELECT
  a.area_name,
  SUM(md.energy) AS total_energy
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.area_name
ORDER BY total_energy DESC
LIMIT 10;
  area_name | total_energy
------------+---------------
  Area 2    | 1.1106e+07
  Area 1    | 1.110399e+07
  Area 100  | 1.110198e+07
  Area 99   | 1.109997e+07
  Area 98   | 1.109796e+07
  Area 97   | 1.109595e+07
  Area 96   | 1.109394e+07
  Area 95   | 1.109193e+07
  Area 94   | 1.108992e+07
  Area 93   | 1.108791e+07
(10 rows)

Time: 34.692667ms
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
```sql
root@127.0.0.1:26257/defaultdb> SELECT
  mi.meter_id,
  u.user_name,
  u.contact,
  a.area_name
FROM rdb.meter_info mi
JOIN rdb.user_info u ON mi.user_id = u.user_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
WHERE mi.status = 'Fault';
  meter_id | user_name |   contact   | area_name
-----------+-----------+-------------+------------
  M100     | User 1    | 13800138001 | Area 1
  M20      | User 21   | 13800138021 | Area 21
  M40      | User 41   | 13800138041 | Area 41
  M60      | User 61   | 13800138061 | Area 61
  M80      | User 81   | 13800138081 | Area 81
(5 rows)

Time: 4.164833ms
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
root@127.0.0.1:26257/defaultdb> SELECT
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
  meter_id | voltage_level | status | user_name | area_name | data_points
-----------+---------------+--------+-----------+-----------+--------------
  M1       | 380V          | Normal | User 2    | Area 2    |         201
(1 row)

Time: 15.62525ms      
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
root@127.0.0.1:26257/defaultdb> SELECT
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
  meter_id |              ts               | rule_name | voltage | current | power
-----------+-------------------------------+-----------+---------+---------+--------
  M2       | 2025-04-16 07:40:22.284+00:00 | 高压告警  |     221 |     5.1 |  1050
  M2       | 2025-04-16 07:40:22.284+00:00 | 低压告警  |     221 |     5.1 |  1050
  M3       | 2025-04-16 07:30:22.284+00:00 | 高压告警  |     222 |     5.2 |  1100
  M3       | 2025-04-16 07:30:22.284+00:00 | 低压告警  |     222 |     5.2 |  1100
  M4       | 2025-04-16 07:20:22.284+00:00 | 高压告警  |     223 |     5.3 |  1150
  M4       | 2025-04-16 07:20:22.284+00:00 | 低压告警  |     223 |     5.3 |  1150
  M5       | 2025-04-16 07:10:22.284+00:00 | 高压告警  |     224 |     5.4 |  1200
  M5       | 2025-04-16 07:10:22.284+00:00 | 低压告警  |     224 |     5.4 |  1200
  M6       | 2025-04-16 07:00:22.284+00:00 | 低压告警  |     225 |     5.5 |  1250
  M6       | 2025-04-16 07:00:22.284+00:00 | 高压告警  |     225 |     5.5 |  1250
  M7       | 2025-04-16 06:50:22.284+00:00 | 低压告警  |     226 |     5.6 |  1300
  M7       | 2025-04-16 06:50:22.284+00:00 | 高压告警  |     226 |     5.6 |  1300
  M8       | 2025-04-16 06:40:22.284+00:00 | 低压告警  |     227 |     5.7 |  1350
  M8       | 2025-04-16 06:40:22.284+00:00 | 高压告警  |     227 |     5.7 |  1350
  M9       | 2025-04-16 06:30:22.284+00:00 | 高压告警  |     228 |     5.8 |  1400
  M9       | 2025-04-16 06:30:22.284+00:00 | 低压告警  |     228 |     5.8 |  1400
  M10      | 2025-04-16 06:20:22.284+00:00 | 低压告警  |     229 |     5.9 |  1450
  M10      | 2025-04-16 06:20:22.284+00:00 | 高压告警  |     229 |     5.9 |  1450
  M11      | 2025-04-16 06:10:22.284+00:00 | 低压告警  |     220 |       6 |  1500
  M11      | 2025-04-16 06:10:22.284+00:00 | 高压告警  |     220 |       6 |  1500
  M12      | 2025-04-16 06:00:22.284+00:00 | 高压告警  |     221 |     6.1 |  1550
  M12      | 2025-04-16 06:00:22.284+00:00 | 低压告警  |     221 |     6.1 |  1550
  M13      | 2025-04-16 05:50:22.284+00:00 | 低压告警  |     222 |     6.2 |  1600
  M13      | 2025-04-16 05:50:22.284+00:00 | 高压告警  |     222 |     6.2 |  1600
  M14      | 2025-04-16 05:40:22.284+00:00 | 高压告警  |     223 |     6.3 |  1650
  M14      | 2025-04-16 05:40:22.284+00:00 | 低压告警  |     223 |     6.3 |  1650
  M15      | 2025-04-16 05:30:22.284+00:00 | 高压告警  |     224 |     6.4 |  1700
  M15      | 2025-04-16 05:30:22.284+00:00 | 低压告警  |     224 |     6.4 |  1700
  M16      | 2025-04-16 05:20:22.284+00:00 | 高压告警  |     225 |       5 |  1750
  M16      | 2025-04-16 05:20:22.284+00:00 | 低压告警  |     225 |       5 |  1750
  M17      | 2025-04-16 05:10:22.284+00:00 | 高压告警  |     226 |     5.1 |  1800
  M17      | 2025-04-16 05:10:22.284+00:00 | 低压告警  |     226 |     5.1 |  1800
  M18      | 2025-04-16 05:00:22.284+00:00 | 低压告警  |     227 |     5.2 |  1850
  M18      | 2025-04-16 05:00:22.284+00:00 | 高压告警  |     227 |     5.2 |  1850
  M19      | 2025-04-16 04:50:22.284+00:00 | 低压告警  |     228 |     5.3 |  1900
  M19      | 2025-04-16 04:50:22.284+00:00 | 高压告警  |     228 |     5.3 |  1900
  M20      | 2025-04-16 04:40:22.284+00:00 | 高压告警  |     229 |     5.4 |  1950
  M20      | 2025-04-16 04:40:22.284+00:00 | 低压告警  |     229 |     5.4 |  1950
  M21      | 2025-04-16 04:30:22.284+00:00 | 低压告警  |     220 |     5.5 |  1000
  M21      | 2025-04-16 04:30:22.284+00:00 | 高压告警  |     220 |     5.5 |  1000
  M22      | 2025-04-16 04:20:22.284+00:00 | 低压告警  |     221 |     5.6 |  1050
  M22      | 2025-04-16 04:20:22.284+00:00 | 高压告警  |     221 |     5.6 |  1050
  M23      | 2025-04-16 04:10:22.284+00:00 | 低压告警  |     222 |     5.7 |  1100
  M23      | 2025-04-16 04:10:22.284+00:00 | 高压告警  |     222 |     5.7 |  1100
  M24      | 2025-04-16 04:00:22.284+00:00 | 低压告警  |     223 |     5.8 |  1150
  M24      | 2025-04-16 04:00:22.284+00:00 | 高压告警  |     223 |     5.8 |  1150
  M25      | 2025-04-16 03:50:22.284+00:00 | 高压告警  |     224 |     5.9 |  1200
  M25      | 2025-04-16 03:50:22.284+00:00 | 低压告警  |     224 |     5.9 |  1200
  M26      | 2025-04-16 03:40:22.284+00:00 | 高压告警  |     225 |       6 |  1250
  M26      | 2025-04-16 03:40:22.284+00:00 | 低压告警  |     225 |       6 |  1250
  M27      | 2025-04-16 03:30:22.284+00:00 | 低压告警  |     226 |     6.1 |  1300
  M27      | 2025-04-16 03:30:22.284+00:00 | 高压告警  |     226 |     6.1 |  1300
  M28      | 2025-04-16 03:20:22.284+00:00 | 低压告警  |     227 |     6.2 |  1350
  M28      | 2025-04-16 03:20:22.284+00:00 | 高压告警  |     227 |     6.2 |  1350
  M29      | 2025-04-16 03:10:22.284+00:00 | 低压告警  |     228 |     6.3 |  1400
  M29      | 2025-04-16 03:10:22.284+00:00 | 高压告警  |     228 |     6.3 |  1400
  M30      | 2025-04-16 03:00:22.284+00:00 | 高压告警  |     229 |     6.4 |  1450
  M30      | 2025-04-16 03:00:22.284+00:00 | 低压告警  |     229 |     6.4 |  1450
  M31      | 2025-04-16 02:50:22.284+00:00 | 高压告警  |     220 |       5 |  1500
  M31      | 2025-04-16 02:50:22.284+00:00 | 低压告警  |     220 |       5 |  1500
  M32      | 2025-04-16 02:40:22.284+00:00 | 高压告警  |     221 |     5.1 |  1550
  M32      | 2025-04-16 02:40:22.284+00:00 | 低压告警  |     221 |     5.1 |  1550
  M33      | 2025-04-16 02:30:22.284+00:00 | 低压告警  |     222 |     5.2 |  1600
  M33      | 2025-04-16 02:30:22.284+00:00 | 高压告警  |     222 |     5.2 |  1600
  M34      | 2025-04-16 02:20:22.284+00:00 | 低压告警  |     223 |     5.3 |  1650
  M34      | 2025-04-16 02:20:22.284+00:00 | 高压告警  |     223 |     5.3 |  1650
  M35      | 2025-04-16 02:10:22.284+00:00 | 低压告警  |     224 |     5.4 |  1700
  M35      | 2025-04-16 02:10:22.284+00:00 | 高压告警  |     224 |     5.4 |  1700
  M36      | 2025-04-16 02:00:22.284+00:00 | 低压告警  |     225 |     5.5 |  1750
  M36      | 2025-04-16 02:00:22.284+00:00 | 高压告警  |     225 |     5.5 |  1750
  M37      | 2025-04-16 01:50:22.284+00:00 | 高压告警  |     226 |     5.6 |  1800
  M37      | 2025-04-16 01:50:22.284+00:00 | 低压告警  |     226 |     5.6 |  1800
  M38      | 2025-04-16 01:40:22.284+00:00 | 低压告警  |     227 |     5.7 |  1850
  M38      | 2025-04-16 01:40:22.284+00:00 | 高压告警  |     227 |     5.7 |  1850
  M39      | 2025-04-16 01:30:22.284+00:00 | 高压告警  |     228 |     5.8 |  1900
  M39      | 2025-04-16 01:30:22.284+00:00 | 低压告警  |     228 |     5.8 |  1900
  M40      | 2025-04-16 01:20:22.284+00:00 | 高压告警  |     229 |     5.9 |  1950
  M40      | 2025-04-16 01:20:22.284+00:00 | 低压告警  |     229 |     5.9 |  1950
  M41      | 2025-04-16 01:10:22.284+00:00 | 低压告警  |     220 |       6 |  1000
  M41      | 2025-04-16 01:10:22.284+00:00 | 高压告警  |     220 |       6 |  1000
  M42      | 2025-04-16 01:00:22.284+00:00 | 高压告警  |     221 |     6.1 |  1050
  M42      | 2025-04-16 01:00:22.284+00:00 | 低压告警  |     221 |     6.1 |  1050
  M43      | 2025-04-16 00:50:22.284+00:00 | 高压告警  |     222 |     6.2 |  1100
  M43      | 2025-04-16 00:50:22.284+00:00 | 低压告警  |     222 |     6.2 |  1100
  M44      | 2025-04-16 00:40:22.284+00:00 | 高压告警  |     223 |     6.3 |  1150
  M44      | 2025-04-16 00:40:22.284+00:00 | 低压告警  |     223 |     6.3 |  1150
  M45      | 2025-04-16 00:30:22.284+00:00 | 高压告警  |     224 |     6.4 |  1200
  M45      | 2025-04-16 00:30:22.284+00:00 | 低压告警  |     224 |     6.4 |  1200
  M46      | 2025-04-16 00:20:22.284+00:00 | 低压告警  |     225 |       5 |  1250
  M46      | 2025-04-16 00:20:22.284+00:00 | 高压告警  |     225 |       5 |  1250
  M47      | 2025-04-16 00:10:22.284+00:00 | 低压告警  |     226 |     5.1 |  1300
  M47      | 2025-04-16 00:10:22.284+00:00 | 高压告警  |     226 |     5.1 |  1300
  M48      | 2025-04-16 00:00:22.284+00:00 | 低压告警  |     227 |     5.2 |  1350
  M48      | 2025-04-16 00:00:22.284+00:00 | 高压告警  |     227 |     5.2 |  1350
  M49      | 2025-04-15 23:50:22.284+00:00 | 高压告警  |     228 |     5.3 |  1400
  M49      | 2025-04-15 23:50:22.284+00:00 | 低压告警  |     228 |     5.3 |  1400
  M50      | 2025-04-15 23:40:22.284+00:00 | 低压告警  |     229 |     5.4 |  1450
  M50      | 2025-04-15 23:40:22.284+00:00 | 高压告警  |     229 |     5.4 |  1450
  M51      | 2025-04-15 23:30:22.284+00:00 | 高压告警  |     220 |     5.5 |  1500
  M51      | 2025-04-15 23:30:22.284+00:00 | 低压告警  |     220 |     5.5 |  1500
(100 rows)

Time: 82.002958ms
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
root@127.0.0.1:26257/defaultdb> SELECT
  a.region,
  a.area_name,
  SUM(md.energy) AS total_energy,
  AVG(md.power) AS avg_power
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.region, a.area_name;
  region | area_name | total_energy | avg_power
---------+-----------+--------------+------------
  South  | Area 67   | 1.103565e+07 |      1250
  South  | Area 68   | 1.103766e+07 |      1300
  South  | Area 69   | 1.103967e+07 |      1350
  North  | Area 7    | 1.091505e+07 |      1250
  South  | Area 70   | 1.104168e+07 |      1400
  South  | Area 71   | 1.104369e+07 |      1450
  South  | Area 72   | 1.10457e+07  |      1500
  South  | Area 73   | 1.104771e+07 |      1550
  South  | Area 74   | 1.104972e+07 |      1600
  West   | Area 75   | 1.105173e+07 |      1650
  West   | Area 76   | 1.105374e+07 |      1700
  West   | Area 77   | 1.105575e+07 |      1750
  South  | Area 56   | 1.101354e+07 |      1700
  South  | Area 57   | 1.101555e+07 |      1750
  South  | Area 58   | 1.101756e+07 |      1800
  South  | Area 59   | 1.101957e+07 |      1850
  North  | Area 6    | 1.091304e+07 |      1200
  South  | Area 60   | 1.102158e+07 |      1900
  South  | Area 61   | 1.102359e+07 |      1950
  South  | Area 62   | 1.10256e+07  |      1000
  South  | Area 63   | 1.102761e+07 |      1050
  South  | Area 64   | 1.102962e+07 |      1100
  South  | Area 65   | 1.103163e+07 |      1150
  South  | Area 66   | 1.103364e+07 |      1200
  West   | Area 89   | 1.107987e+07 |      1350
  North  | Area 9    | 1.091907e+07 |      1350
  West   | Area 90   | 1.108188e+07 |      1400
  West   | Area 91   | 1.108389e+07 |      1450
  West   | Area 92   | 1.10859e+07  |      1500
  West   | Area 93   | 1.108791e+07 |      1550
  West   | Area 94   | 1.108992e+07 |      1600
  West   | Area 95   | 1.109193e+07 |      1650
  West   | Area 96   | 1.109394e+07 |      1700
  West   | Area 97   | 1.109595e+07 |      1750
  West   | Area 98   | 1.109796e+07 |      1800
  West   | Area 99   | 1.109997e+07 |      1850
  East   | Area 32   | 1.09653e+07  |      1500
  East   | Area 33   | 1.096731e+07 |      1550
  East   | Area 34   | 1.096932e+07 |      1600
  East   | Area 35   | 1.097133e+07 |      1650
  East   | Area 36   | 1.097334e+07 |      1700
  East   | Area 37   | 1.097535e+07 |      1750
  East   | Area 38   | 1.097736e+07 |      1800
  East   | Area 39   | 1.097937e+07 |      1850
  North  | Area 4    | 1.090902e+07 |      1100
  East   | Area 40   | 1.098138e+07 |      1900
  East   | Area 41   | 1.098339e+07 |      1950
  East   | Area 42   | 1.09854e+07  |      1000
  East   | Area 43   | 1.098741e+07 |      1050
  West   | Area 78   | 1.105776e+07 |      1800
  West   | Area 79   | 1.105977e+07 |      1850
  North  | Area 8    | 1.091706e+07 |      1300
  West   | Area 80   | 1.106178e+07 |      1900
  West   | Area 81   | 1.106379e+07 |      1950
  West   | Area 82   | 1.10658e+07  |      1000
  West   | Area 83   | 1.106781e+07 |      1050
  West   | Area 84   | 1.106982e+07 |      1100
  West   | Area 85   | 1.107183e+07 |      1150
  West   | Area 86   | 1.107384e+07 |      1200
  West   | Area 87   | 1.107585e+07 |      1250
  West   | Area 88   | 1.107786e+07 |      1300
  North  | Area 20   | 1.094118e+07 |      1900
  North  | Area 21   | 1.094319e+07 |      1950
  North  | Area 22   | 1.09452e+07  |      1000
  North  | Area 23   | 1.094721e+07 |      1050
  North  | Area 24   | 1.094922e+07 |      1100
  East   | Area 25   | 1.095123e+07 |      1150
  East   | Area 26   | 1.095324e+07 |      1200
  East   | Area 27   | 1.095525e+07 |      1250
  East   | Area 28   | 1.095726e+07 |      1300
  East   | Area 29   | 1.095927e+07 |      1350
  North  | Area 3    | 1.090701e+07 |      1050
  East   | Area 30   | 1.096128e+07 |      1400
  East   | Area 31   | 1.096329e+07 |      1450
  East   | Area 44   | 1.098942e+07 |      1100
  East   | Area 45   | 1.099143e+07 |      1150
  East   | Area 46   | 1.099344e+07 |      1200
  East   | Area 47   | 1.099545e+07 |      1250
  East   | Area 48   | 1.099746e+07 |      1300
  East   | Area 49   | 1.099947e+07 |      1350
  North  | Area 5    | 1.091103e+07 |      1150
  South  | Area 50   | 1.100148e+07 |      1400
  South  | Area 51   | 1.100349e+07 |      1450
  South  | Area 52   | 1.10055e+07  |      1500
  South  | Area 53   | 1.100751e+07 |      1550
  South  | Area 54   | 1.100952e+07 |      1600
  South  | Area 55   | 1.101153e+07 |      1650
  North  | Area 1    | 1.110399e+07 |      1950
  North  | Area 10   | 1.092108e+07 |      1400
  West   | Area 100  | 1.110198e+07 |      1900
  North  | Area 11   | 1.092309e+07 |      1450
  North  | Area 12   | 1.09251e+07  |      1500
  North  | Area 13   | 1.092711e+07 |      1550
  North  | Area 14   | 1.092912e+07 |      1600
  North  | Area 15   | 1.093113e+07 |      1650
  North  | Area 16   | 1.093314e+07 |      1700
  North  | Area 17   | 1.093515e+07 |      1750
  North  | Area 18   | 1.093716e+07 |      1800
  North  | Area 19   | 1.093917e+07 |      1850
  North  | Area 2    | 1.1106e+07   |      1000
(100 rows)

Time: 28.154125ms
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
root@127.0.0.1:26257/defaultdb> SELECT
  md.ts,
  md.power,
  md.energy
FROM tsdb.meter_data md
WHERE md.meter_id = 'M1'
  AND md.ts > NOW() - INTERVAL '24 hours'
ORDER BY md.ts;
               ts               | power | energy
--------------------------------+-------+---------
  2025-04-15 15:10:22.284+00:00 |  1000 |   6000
(1 row)

Time: 4.327417ms
```
