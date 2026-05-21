SELECT 'rdb.meter_info' AS table_name, COUNT(*) AS row_count FROM rdb.meter_info
UNION ALL
SELECT 'rdb.user_info' AS table_name, COUNT(*) AS row_count FROM rdb.user_info
UNION ALL
SELECT 'rdb.area_info' AS table_name, COUNT(*) AS row_count FROM rdb.area_info
UNION ALL
SELECT 'rdb.alarm_rules' AS table_name, COUNT(*) AS row_count FROM rdb.alarm_rules
UNION ALL
SELECT 'tsdb.meter_data' AS table_name, COUNT(*) AS row_count FROM tsdb.meter_data;

SELECT
  a.area_name,
  SUM(md.energy) AS total_energy
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.area_name
ORDER BY total_energy DESC
LIMIT 10;

SELECT
  mi.meter_id,
  u.user_name,
  u.contact,
  a.area_name
FROM rdb.meter_info mi
JOIN rdb.user_info u ON mi.user_id = u.user_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
WHERE mi.status = 'Fault';

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

SELECT
  a.region,
  a.area_name,
  SUM(md.energy) AS total_energy,
  AVG(md.power) AS avg_power
FROM tsdb.meter_data md
JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
JOIN rdb.area_info a ON mi.area_id = a.area_id
GROUP BY a.region, a.area_name
ORDER BY a.region, a.area_name
LIMIT 100;

SELECT
  md.ts,
  md.power,
  md.energy
FROM tsdb.meter_data md
WHERE md.meter_id = 'M1'
ORDER BY md.ts DESC
LIMIT 24;

SELECT
  meter_id,
  time_bucket(ts, '1h') AS bucket_start,
  COUNT(*) AS sample_count,
  AVG(power) AS avg_power,
  MAX(power) AS max_power
FROM tsdb.meter_data
WHERE meter_id IN ('M1', 'M2', 'M3')
GROUP BY meter_id, bucket_start
ORDER BY meter_id, bucket_start
LIMIT 100;

SELECT
  meter_id,
  first(ts) AS session_start,
  last(ts) AS session_end,
  COUNT(*) AS sample_count,
  SUM(energy) AS total_energy
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, session_window(ts, '30m')
ORDER BY session_start
LIMIT 100;

SELECT
  meter_id,
  first(ts) AS window_start,
  last(ts) AS window_end,
  COUNT(*) AS sample_count,
  MIN(voltage) AS min_voltage,
  MAX(voltage) AS max_voltage
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY
  meter_id,
  state_window(CASE WHEN voltage >= 225 THEN 'high' ELSE 'low' END)
ORDER BY window_start;

SELECT
  meter_id,
  first(ts) AS event_start,
  last(ts) AS event_end,
  COUNT(*) AS sample_count,
  MAX(current) AS peak_current,
  AVG(power) AS avg_power
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, event_window(current >= 6, current <= 5.3)
ORDER BY event_start
LIMIT 100;

SELECT
  meter_id,
  first(ts) AS window_start,
  last(ts) AS window_end,
  COUNT(*) AS sample_count,
  AVG(power) AS avg_power,
  MAX(power) AS max_power
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, count_window(12, 6)
ORDER BY window_start;
