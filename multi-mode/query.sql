SELECT si.station_name,
       COUNT(t.measure_value),
       AVG(t.measure_value)
FROM pipec_r.station_info si,              
     pipec_r.workarea_info wi,             
     db_pipec.t_point t                    
WHERE wi.work_area_sn = si.work_area_sn    
  AND si.station_sn = t.station_sn         
  AND t.measure_type = 1                   
  AND t.measure_value > 50                 
GROUP BY si.station_name
HAVING COUNT(t.measure_value) > 3
ORDER BY si.station_name;

SELECT wi.work_area_name,
       si.station_name,
       t.measure_type,
       time_bucket(t.k_timestamp, '10s') AS timebucket,
       AVG(t.measure_value) AS avg_value,
       MAX(t.measure_value) AS max_value,
       MIN(t.measure_value) AS min_value,
       COUNT(t.measure_value) AS number_of_value
FROM pipec_r.station_info si,
     pipec_r.workarea_info wi,
     pipec_r.pipeline_info li,
     pipec_r.point_info pi,
     db_pipec.t_point t
WHERE li.pipeline_sn = pi.pipeline_sn
  AND pi.station_sn = si.station_sn
  AND si.work_area_sn = wi.work_area_sn
  AND t.point_sn = pi.point_sn
  AND li.pipeline_name = 'Pipe_3'
  AND wi.work_area_name in ('Area_8', 'Area_12', 'Area_16')
  AND t.k_timestamp >= '2023-08-01 01:00:00'
GROUP BY wi.work_area_name,
         si.station_name,
         t.measure_type,
         timebucket;

	SELECT
    time_bucket(t.k_timestamp, '1h') AS timebucket,
    s.work_area_sn,
    w.work_area_name,
    pinfo.pipeline_name,
    COUNT(t.k_timestamp) AS measurement_count,
    SUM(t.measure_value) AS total_measure_value,
    AVG(t.measure_value) AS avg_measure_value
FROM
    db_pipec.t_point t,        -- 45M
    pipec_r.station_info s,    -- 436
    pipec_r.workarea_info w,   -- 41
    pipec_r.pipeline_info pinfo  -- 26
WHERE
    t.work_area_sn = s.work_area_sn    -- 41, 41
    AND t.pipeline_sn = pinfo.pipeline_sn    -- 21, 41
    AND s.work_area_sn = w.work_area_sn    -- 41, 41
    AND t.k_timestamp BETWEEN '2023-01-04 14:31:00' AND '2030-01-04 14:31:00'    -- 2M/45M
GROUP BY
    timebucket, s.work_area_sn, w.work_area_name, pinfo.pipeline_name
ORDER BY
    timebucket, s.work_area_sn
LIMIT 100;

SELECT wi.work_area_name,
       si.station_name,
       t.measure_type,
       time_bucket(t.k_timestamp, '5s') as timebucket,
       avg(t.measure_value)
FROM pipec_r.point_info pi,           -- 41
     pipec_r.pipeline_info li,        -- 41
     pipec_r.workarea_info wi,        -- 41
     pipec_r.station_info si,         -- 436
     db_pipec.t_point t               -- 45M
WHERE pi.pipeline_sn = li.pipeline_sn
  AND pi.station_sn = si.station_sn
  AND si.work_area_sn = wi.work_area_sn -- 41, 41
  AND pi.point_sn = t.point_sn      -- 436, 401
  AND li.pipeline_name = 'Pipe_9'    -- 1/26
  AND wi.work_area_name = 'Area_7' -- 1/41
GROUP BY wi.work_area_name, si.station_name, t.measure_type, timebucket;
