SELECT * FROM sensors.sensor_data ORDER BY ts;

SELECT COUNT(*) FROM sensors.sensor_data WHERE ptagid= 3;

SELECT ptagid, AVG(temperature) FROM sensors.sensor_data GROUP BY ptagid;

SELECT SUM(stress) FROM sensors.sensor_data WHERE ts > '2024-12-01';

SELECT ptagid, MIN(temperature) FROM sensors.sensor_data GROUP BY ptagid;

SELECT ptagid, MAX(temperature) FROM sensors.sensor_data GROUP BY ptagid;

SELECT ptagid, AVG(temperature), STDDEV(temperature) FROM sensors.sensor_data GROUP BY ptagid;

SELECT first(temperature) AS first_temp FROM sensors.sensor_data;

SELECT last(temperature) AS last_temp FROM sensors.sensor_data;


SELECT  time_bucket(ts, '2h') bucket, last(temperature)
FROM sensors.sensor_data
group by bucket
order by bucket;

SELECT twa(ts, temperature) FROM sensors.sensor_data;

SELECT twa(ts, temperature * 2) FROM sensors.sensor_data;



