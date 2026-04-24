SELECT * FROM ts_window.vehicles ORDER BY ts;

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY COUNT_WINDOW(3);

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY COUNT_WINDOW(3, 2);

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY EVENT_WINDOW(speed < 30, speed >= 35);

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY SESSION_WINDOW(ts, '5m');

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY STATE_WINDOW(CASE WHEN speed < 35 THEN 'low' ELSE 'high' END);

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY TIME_WINDOW(ts, '10m');

SELECT
  count(ts) AS records,
  avg(speed) AS avg_speed
FROM ts_window.vehicles
GROUP BY TIME_WINDOW(ts, '10m', '5m');
