# SampleDB

SampleDB 是一个用于展示示例数据与场景的项目。其核心目标是助力用户快速掌握 KWDB 数据库的使用方法，为用户提供便捷的测试与学习环境。

## 示例一：智能电表模型

- [表结构设计](./smart-meter/README.md#表结构设计)
- [导入数据](./smart-meter/README.md#导入数据)
- [准备数据](./smart-meter/README.md#准备数据)
  - [关系库 rdb](./smart-meter/README.md#关系库-rdb)
  - [时序库 tsdb](./smart-meter/README.md#时序库-tsdb)
  - [时序数据生成语句](./smart-meter/README.md#时序数据生成语句)
- [场景示例](./smart-meter/README#场景示例)
  - [查询区域用电量TOP10](./smart-meter/scenario.md#查询区域用电量top10)  
  - [查询故障电表及用户信息](./smart-meter/scenario.md#查询故障电表及用户信息)
  - [电表概要查询](./smart-meter/scenario.md#电表概要查询)  
  - [告警检测查询](./smart-meter/scenario.md#告警检测查询)  
  - [区域用电量统计](./smart-meter/scenario.md#区域用电量统计)  
  - [查询指定电表最近24小时用电趋势量](./smart-meter/scenario.md#查询指定电表最近24小时用电趋势量)


同时，还提供了一个基于 KWDB 多模数据库的智能电表数据管理和可视化演示系统。推荐使用 docker 进行试用：

```bash
# 运行容器
docker run -d --name smart-meter \
  -p 5173:5173 \
  -p 3001:3001 \
  kwdb/smart-meter:latest

# 访问应用
# Web 界面: http://localhost:5173
# API 服务: http://localhost:3001
```

## 示例二：跨模查询

跨模式查询（Multi-Mode Query）是指在一个查询语句中同时从多个数据库模式（如关系型数据库、时序数据库等）中获取数据，并对这些数据进行联合分析。本示例为物联网场景跨模查询，展示关系数据与时序数据的联合分析能力：

### 技术亮点

- 跨模统计信息和代价估算融合技术
- 跨模聚合下推技术
- 高速跨模连接算子技术

### 文件清单

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

### 快速体验

1. 执行 `generate_data.sh` 脚本，生成时序表数据以及关系表数据
2. 执行 `create-load.sh` 脚本，创建数据库、时序表、关系表，并将数据导入表中
3. 执行 `query.sh` 脚本，体验跨模查询
4. （可选）执行 `multi_test.sh` 脚本，一键体验

详细操作指南请参考[跨模查询文档](./multi-mode/README.md)

## 贡献

我们欢迎任何形式的贡献！请随时提交 Issue 或 PR。

## 许可证

本项目采用 MIT 许可证，详情请参阅 [LICENSE](./LICENSE) 文件。
