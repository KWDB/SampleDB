SELECT si.site_name,
       COUNT(t.monitor_value),
       AVG(t.monitor_value)
FROM monitor_r.site_info si,              
     monitor_r.region_info wi,             
     db_monitor.t_monitor_point t                    
WHERE wi.region_id = si.region_id    
  AND si.site_id = t.site_id         
  AND t.monitor_type = 1                   
  AND t.monitor_value > 50                 
GROUP BY si.site_name
HAVING COUNT(t.monitor_value) > 3
ORDER BY si.site_name;

SELECT wi.region_name,
       si.site_name,
       t.monitor_type,
       time_bucket(t.k_collect_time, '10s') AS timebucket,
       AVG(t.monitor_value) AS avg_value,
       MAX(t.monitor_value) AS max_value,
       MIN(t.monitor_value) AS min_value,
       COUNT(t.monitor_value) AS number_of_value
FROM monitor_r.site_info si,
     monitor_r.region_info wi,
     monitor_r.pipeline_info li,
     monitor_r.point_base_info pi,
     db_monitor.t_monitor_point t
WHERE li.pipeline_id = pi.pipeline_id
  AND pi.site_id = si.site_id
  AND si.region_id = wi.region_id
  AND t.point_id = pi.point_id
  AND li.pipeline_name = 'Pipe_3'
  AND wi.region_name in ('Area_8', 'Area_12', 'Area_16')
  AND t.k_collect_time >= '2023-08-01 01:00:00'
GROUP BY wi.region_name,
         si.site_name,
         t.monitor_type,
         timebucket;

SELECT
    time_bucket(t.k_collect_time, '1h') AS timebucket,
    s.region_id,
    w.region_name,
    pinfo.pipeline_name,
    COUNT(t.k_collect_time) AS measurement_count,
    SUM(t.monitor_value) AS total_measure_value,
    AVG(t.monitor_value) AS avg_measure_value
FROM
    db_monitor.t_monitor_point t,        
    monitor_r.site_info s,    
    monitor_r.region_info w,   
    monitor_r.pipeline_info pinfo  
WHERE
    t.region_id = s.region_id    
    AND t.pipeline_id = pinfo.pipeline_id    
    AND s.region_id = w.region_id    
    AND t.k_collect_time BETWEEN '2023-01-04 14:31:00' AND '2030-01-04 14:31:00'    
GROUP BY
    timebucket, s.region_id, w.region_name, pinfo.pipeline_name
ORDER BY
    timebucket, s.region_id
LIMIT 100;

SELECT wi.region_name,
       si.site_name,
       t.monitor_type,
       time_bucket(t.k_collect_time, '5s') as timebucket,
       avg(t.monitor_value)
FROM monitor_r.point_base_info pi,           
     monitor_r.pipeline_info li,        
     monitor_r.region_info wi,        
     monitor_r.site_info si,        
     db_monitor.t_monitor_point t               
WHERE pi.pipeline_id = li.pipeline_id
  AND pi.site_id = si.site_id
  AND si.region_id = wi.region_id 
  AND pi.point_id = t.point_id      
  AND li.pipeline_name = 'Pipe_9'    
  AND wi.region_name = 'Area_7' 
GROUP BY wi.region_name, si.site_name, t.monitor_type, timebucket;
