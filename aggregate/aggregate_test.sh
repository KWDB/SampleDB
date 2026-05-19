#!/bin/bash

echo "----启动数据库服务----"
bash start_service.sh
echo "----生成聚合函数示例数据----"
bash generate_data.sh
echo "----建表与导入数据----"
bash create_load.sh
echo "----执行聚合函数查询----"
bash query.sh
