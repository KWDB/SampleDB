#!/bin/bash

echo "----启动数据库服务----"
bash start_service.sh
echo "----生成窗口函数示例数据----"
bash generate_data.sh
echo "----建表与导入数据----"
bash create_load.sh
echo "----执行窗口函数查询----"
bash query.sh
