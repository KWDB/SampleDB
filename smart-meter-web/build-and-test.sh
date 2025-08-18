#!/bin/bash

# 智能电表 Web 应用 Docker 构建和测试脚本
# 此脚本用于构建多阶段 Dockerfile 并测试容器运行

set -e  # 遇到错误时立即退出

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
IMAGE_NAME="smart-meter-web"
IMAGE_TAG="latest"
CONTAINER_NAME="smart-meter-container"
PORTS="-p 3001:3001"

echo -e "${BLUE}=== 智能电表 Web 应用 Docker 构建和测试 ===${NC}"
echo

# 函数：清理现有容器和镜像
cleanup() {
    echo -e "${YELLOW}清理现有容器和镜像...${NC}"
    
    # 停止并删除现有容器
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "停止并删除现有容器: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    
    # 删除现有镜像
    if docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
        echo "删除现有镜像: ${IMAGE_NAME}:${IMAGE_TAG}"
        docker rmi ${IMAGE_NAME}:${IMAGE_TAG} 2>/dev/null || true
    fi
    
    echo -e "${GREEN}清理完成${NC}"
    echo
}

# 函数：构建 Docker 镜像
build_image() {
    echo -e "${BLUE}开始构建 Docker 镜像...${NC}"
    echo "镜像名称: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "构建上下文: $(pwd)"
    echo
    
    # 检查 Dockerfile 是否存在
    if [ ! -f "Dockerfile" ]; then
        echo -e "${RED}错误: 未找到 Dockerfile${NC}"
        exit 1
    fi
    
    # 检查必要的目录是否存在
    if [ ! -d "../smart-meter-web/client" ] || [ ! -d "../smart-meter-web/server" ]; then
        echo -e "${RED}错误: 未找到 client 或 server 目录${NC}"
        exit 1
    fi
    
    # 检查数据文件是否存在
    if [ ! -f "../smart-meter/extern/rdb.tar.gz" ] || [ ! -f "../smart-meter/extern/tsdb.tar.gz" ]; then
        echo -e "${RED}错误: 未找到必要的数据文件 (rdb.tar.gz 或 tsdb.tar.gz)${NC}"
        exit 1
    fi
    
    # 构建镜像
    echo -e "${YELLOW}执行 docker build 命令...${NC}"
    if docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f Dockerfile ..; then
        echo -e "${GREEN}✓ Docker 镜像构建成功!${NC}"
    else
        echo -e "${RED}✗ Docker 镜像构建失败!${NC}"
        exit 1
    fi
    echo
}

# 函数：运行容器
run_container() {
    echo -e "${BLUE}启动 Docker 容器...${NC}"
    echo "容器名称: ${CONTAINER_NAME}"
    echo "端口映射: ${PORTS}"
    echo
    
    # 运行容器
    echo -e "${YELLOW}执行 docker run 命令...${NC}"
    if docker run -d --name ${CONTAINER_NAME} ${PORTS} ${IMAGE_NAME}:${IMAGE_TAG}; then
        echo -e "${GREEN}✓ 容器启动成功!${NC}"
    else
        echo -e "${RED}✗ 容器启动失败!${NC}"
        exit 1
    fi
    echo
}

# 函数：检查容器状态
check_container() {
    echo -e "${BLUE}检查容器状态...${NC}"
    
    # 等待容器启动
    echo "等待容器完全启动..."
    sleep 10
    
    # 检查容器是否运行
    if docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -q "^${CONTAINER_NAME}"; then
        echo -e "${GREEN}✓ 容器正在运行${NC}"
        
        # 显示容器状态
        echo
        echo "容器详细信息:"
        docker ps --filter "name=${CONTAINER_NAME}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
        
        # 显示容器日志（最后20行）
        echo
        echo -e "${YELLOW}容器启动日志（最后20行）:${NC}"
        docker logs --tail 20 ${CONTAINER_NAME}
        
    else
        echo -e "${RED}✗ 容器未运行${NC}"
        echo "容器日志:"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
    echo
}

# 函数：显示访问信息
show_access_info() {
    echo -e "${GREEN}=== 部署完成! ===${NC}"
    echo
    echo "应用访问地址:"
    echo "  • 智能电表 Web 应用: http://localhost:3001"
    echo "  • KWDB 数据库: localhost:26257"
    echo
    echo "常用命令:"
    echo "  • 查看容器状态: docker ps"
    echo "  • 查看容器日志: docker logs ${CONTAINER_NAME}"
    echo "  • 停止容器: docker stop ${CONTAINER_NAME}"
    echo "  • 删除容器: docker rm ${CONTAINER_NAME}"
    echo "  • 进入容器: docker exec -it ${CONTAINER_NAME} /bin/bash"
    echo
}

# 主执行流程
main() {
    echo "开始时间: $(date)"
    echo
    
    # 检查 Docker 是否安装
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装或未在 PATH 中${NC}"
        exit 1
    fi
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        echo -e "${RED}错误: Docker 服务未运行${NC}"
        exit 1
    fi
    
    # 执行构建和测试流程
    cleanup
    build_image
    run_container
    check_container
    show_access_info
    
    echo "完成时间: $(date)"
    echo -e "${GREEN}构建和测试流程完成!${NC}"
}

# 捕获中断信号，进行清理
trap 'echo -e "\n${YELLOW}收到中断信号，正在清理...${NC}"; docker stop ${CONTAINER_NAME} 2>/dev/null || true; exit 1' INT TERM

# 执行主函数
main "$@"