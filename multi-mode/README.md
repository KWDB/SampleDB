# 跨模查询

## 概述

跨模查询是KWDB的核心跨模能力的重要组成部分，主要指的是在KWDB中跨关系引擎和时序引擎的查询。

在不少物联网业务场景下，用户通常会使用一张表（例如：时序表）存储所有的多模态数据（如：关系型+时序），导致表数据十分冗余庞大，查询速度慢等诸多问题。通过KWDB跨模技术的应用，能够打破传统数据存储与分析的边界，实现多模态数据的无缝连接与高效融合。在 KWDB 中，关系型数据与时序数据可分别存储于关系引擎与时序引擎，通过 KWDB 跨模查询，可实现大幅的性能提升。

本项目旨在带领开发者快速体验 KWDB 的跨模查询。

## 技术特点

KWDB的跨模查询主要包含以下三项技术：

1. 跨模统计信息和代价估算融合技术：融合了多模的数据统计信息模型和代价估算策略，并以此为基础优化了跨模执行计划的规划和剪枝的逻辑，从而在遇到包括连接、聚合、排序、过滤、嵌套等非常复杂的业务查询的时候也能确保获得较优的执行计划。
2. 跨模聚合下推技术：针对跨模计算中包含聚合计算的情况，本项目不仅实现了将常见且理论体系比较成熟的基于关系代数理论的聚合计算下推到时序引擎的优化技术，并且针对时序引擎中数据往往具有静态标签的特性，实现了时序引擎中聚合算子自适应降维和降维算子的自动调用。
3. 高速跨模连接算子技术：针对传统数据库系统在跨引擎计算时处理跨模数据连接计算存在的性能问题，KWDB探索并实现了高速跨模连接算子的技术，此项技术通过在引擎融合、算子对接、内存管理、连接策略等方面一系列优化，实现了跨模连接计算效率提升几十倍甚至上百倍。

下图示例展示的是时序数据跟关系数据的跨模查询计划，同时标识了我们应用的三种跨模查询的技术，首先基于跨模统计信息和代价估算融合技术来可以调整时序算子和关系算子的最优连接顺序，同时评估查询是否可以应用跨模聚合下推技术和高速跨模连接算子技术。图中 BatchLookJoin 就是 KWDB 创新研发的高速跨模连接算子，可以进行高速连接计算，而跨模聚合下推会将聚合操作中关于时序部分的聚合操作推到前面提前聚合，大量裁剪传输的数据量。

![architecture diagram](image.png)  

## 文件清单

```
multi-mode/
    ├── start_service.sh   # 启动数据库单机服务脚本
    ├── generate_data.sh   # 数据生成脚本，
    ├── create-load.sh     # 创建数据库，创建表以及导入数据的脚本 
    ├── create-load.sql    # 创建数据库，创建表以及导入数据的SQL命令
    ├── query.sh           # 跨模查询的脚本
    ├── query.sql          # 跨模查询的SQL命令
    ├── multi_test.sh      # 一键测试的脚本
    └── README.md          # 跨模查询测试介绍文档
```

**注：本项目的脚本仅在 linux 系统执行**

## 操作步骤

* 将上述文件清单中的脚本以及 SQL 文件移至 KWDB 二进制目录下方
* 执行 `start_service.sh` 脚本，启动数据库单机服务(如已启动请忽略本步骤)

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_PORT="11223"
  DEFAULT_HTTP_PORT="8892"
  DEFAULT_STORE="./kwbase-data"

  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}
  HTTP_ADDR=${2:-$DEFAULT_HTTP_PORT}
  STORE=${3:-$DEFAULT_STORE}

  ./kwbase start-single-node --insecure --listen-addr=127.0.0.1:$LISTEN_ADDR --http-addr=127.0.0.1:$HTTP_ADDR --store=$STORE --background
  ```

  > 注：如果启动时候 `--listen-addr` 服务监听端口以及 `--http-addr` admin UI 的端口被占用的话，需要重新指定，如：`bash start_service.sh 11221 8008 ./kwbase-data12`，参数1是服务监听端口，参数2是 admin UI 端口，参数3是数据保存目录</p>

* 执行 `generate_data.sh` 脚本，生成时序表数据以及关系表数据

  可以指定数据存储路径，如 `bash generate_data.sh ./kwbase-data12`，该路径需要与 `start_service.sh` 的保持一致，如果不指定的话，默认是`./kwbase-data`

* 执行 `create-load.sh` 脚本，创建数据库、时序表、关系表，并将数据导入表中

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_PORT="11223"
  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

  ./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < create_load.sql
  ```

  > 注：如果监听端口被占用了，需要重新指定，如：`bash create-load.sh 11221`，该端口必须与 `start_service.sh` 的监听端口保持一致

* 执行 `query.sh` 脚本，体验跨模查询

  ```bash
  #!/bin/bash

  DEFAULT_LISTEN_·PORT="11223"
  LISTEN_ADDR=${1:-$DEFAULT_LISTEN_PORT}

  ./kwbase sql --insecure --host=127.0.0.1:$LISTEN_ADDR < query.sql
  ```

  > 注：如果监听端口被占用了，需要重新指定，如：`bash query.sh 11221`，该端口必须与 `start_service.sh` 的监听端口保持一致

**Tips：可以直接执行 `multi_test.sh` 脚本，一键体验**

## 表结构设计

* 时序表结构

  ```sql
  // 测点数据表，可以是某些采集传感器，采集温度、电压、电流等实时数据
CREATE TABLE db_monitor.t_monitor_point (
  k_collect_time timestamp NOT NULL,  
  monitor_value double               
) ATTRIBUTES (
    point_id varchar(64) NOT NULL,   
    branch_id varchar(32),           
    region_id varchar(16),           
    site_id varchar(16),             
    pipeline_id varchar(16) not null,
    monitor_type smallint,             
    monitor_position varchar(64)       
  )
  PRIMARY TAGS(point_id)             
  ACTIVETIME 3h;                       
  ```

* 关系表结构

  ```sql
  // 业务实体表
CREATE TABLE monitor_r.operation_branch (
  branch_id varchar(32) PRIMARY KEY, 
  branch_name varchar(50),            
  business_scope varchar(128)         
);

  // 场站信息表，记录站点的静态信息，记录站点SN码、站点名、属于哪个区域、属于哪家公司等
CREATE TABLE monitor_r.site_info (
  site_id varchar(16) PRIMARY KEY,  
  site_name varchar(80),               
  region_id varchar(16),             
  branch_id varchar(32),             
  site_address varchar(64),            
  site_desc varchar(128)              
);

  // 工作区域信息表，记录地区的静态信息
CREATE TABLE monitor_r.region_info (
  region_id varchar(16) PRIMARY KEY, 
  region_name varchar(80),             
  region_address varchar(64),          
  region_desc varchar(128)            
);

  // 管线表信息表，记录管线的静态信息，记录管线SN码、管线名
CREATE TABLE monitor_r.pipeline_info (
  pipeline_id varchar(16) PRIMARY KEY,
  pipeline_name varchar(60),            
  pipe_start_point varchar(80),         
  pipe_end_point varchar(80),           
  pipe_spec varchar(30)                 
);

  // 测点信息表，记录测点的静态信息，记录测点SN码、属于哪条管线、属于哪个站点等
CREATE TABLE monitor_r.point_base_info (
  point_id varchar(64) PRIMARY KEY, 
  signal_id varchar(120),            
  signal_desc varchar(200),           
  signal_type varchar(50),            
  site_id varchar(16),               
  pipeline_id varchar(16)            
);
  ```

## 数据生成

生成数据的脚本可以并行生成数据，也可以串行，并行模式要求环境安装 GUN paraller, 如：Linux 的 Ubuntu 环境使用 `sudo apt install parallel` 命令安装。

数据生成脚本会在数据库数据目录下生成 extern 文件，然后在 extern 目录下生成一张时序表以及四张关系表的数据，脚本内写死每张表的数据行数，如果希望更大数据量，可以改脚本内的数值即可，数据量大时建议并行生成模式。

最终生成5个 csv 文件，目录如：`kwbase-data/extern/*.csv`

## 数据导入

导入时序数据

```sql
import into db_monitor.t_monitor_point CSV DATA ("nodelocal://1/t_monitor_point");
```

导入关系数据

```sql
import into monitor_r.site_info CSV DATA ("nodelocal://1/site_info/site_info.csv");
import into monitor_r.region_info CSV DATA ("nodelocal://1/region_info/region_info.csv");
import into monitor_r.pipeline_info CSV DATA ("nodelocal://1/pipeline_info/pipeline_info.csv");
import into monitor_r.point_base_info CSV DATA ("nodelocal://1/point_base_info/point_base_info.csv");
import into monitor_r.operation_branch CSV DATA ("nodelocal://1/operation_branch/operation_branch.csv");
```

## 场景查询

本项目使用城市管道网络（以下简称“管网”）物联网IoT场景。

管网场景是跨模查询的一个典型示例：

1. 静态属性较多，但数据量都不大，因此可以使用关系型数据进行存储；
2. 此场景下，时序表仅记录实时数据以及部分关键属性即可。

通过使用 KWDB，我们将管网场景的数据分类存储在 KWDB 的关系引擎以及时序引擎中，通过跨模查询，既能有效提升查询速率，又能帮助用户节省存储成本。

以下场景涉及共计8个业务实体，41个作业区域，436个场点，26个通道资源，1497个测点。

|层级 | 定位  | 职能  | 规模逻辑 |  
|:-|:-|:-|:-|
业务实体（8个）​​|最高管理单元，负责跨区域资源协调、标准制定及战略决策。|统筹全局性运维策略、预算分配、跨作业区应急预案联动。|8个业务实体可能对应不同行政区划或运营主体（如省级分管公司）。|  
|​作业区域（41个）|区域运维中心，覆盖一定地理范围的管网集群。|执行公司指令，管理下属场站；监督管道巡检、设备维护及数据汇总。<br>示例：按《管道灾害防控规定》，作业区需建立水工保护档案，汛期每周全面巡检1次。|平均每公司管辖5\~6个作业区，体现分级管理效率。|  
|​场点（436个）|管网关键节点（如泵站、调压站、处理厂），承担工艺控制与数据采集。| - 实时监控设备状态（如泵机、阀门）并执行远程控制；<br>- 汇聚所属管道测点数据，边缘计算预处理后上传；<br>- 安全核心：部署独立安全仪表系统（SIS）防范泄漏爆炸风险。|平均每作业区管理10\~11个场站，符合区域设施密度分布。|  
|通道资源（26条）|连接场站的输送干线/支线，物理管网载体。| - 传输水、气、热等介质，需结构安全监测（如腐蚀、地质灾害）；<br>- 承载测点部署，实现全线状态可视化。|26条主干管道由436个场站分段管控，单管道可能跨越多作业区。|  
|​测点（1497个）|管网"神经末梢"，部署于管道或场站关键位置。|实时采集数据并上传，包括：<br>- 感知层参数：压力、流量、温度、泄漏（如声波传感器）；<br>- 环境参数：地质位移、土壤湿度（防范滑坡、渗漏）；<br>- 安全参数：可燃气体浓度（联动报警系统）。|-|
  
**场景一：** 查询每个站点采集类型为1且采集数值高于50的且采集条目多余3条的数据均值和条目数

```sql
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
```

**场景二：** 按照10s一个时间窗口查询某三个区域内每个站点的某条管线在23年8月1日之后的每种采集类型数值的均值、最大最小值、条目数

```sql
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
```

**场景三：** 按照1h一个时间窗口查询每个区域中每条管线自23年1月4日14点31分起七年内的条目数、累计值、均值

```sql
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
```

**场景四：** 按照5s一个时间窗口查询某个区域中每个站点内某条管线的每一种采集类型的数据均值

```sql
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
```
