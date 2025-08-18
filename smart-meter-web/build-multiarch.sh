#!/bin/bash

# 多架构构建和推送脚本
# 支持 amd64 和 arm64 架构

set -e

# 配置变量
IMAGE_NAME="kwdb/smart-meter"
DOCKERFILE_PATH="./Dockerfile"
BUILD_CONTEXT="../"  # 构建上下文为上级目录，因为需要访问 smart-meter/ 目录

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Docker 多架构构建脚本 ===${NC}"
echo -e "${BLUE}镜像名称: ${IMAGE_NAME}${NC}"
echo -e "${BLUE}支持架构: linux/amd64, linux/arm64${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装或不在 PATH 中${NC}"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 服务未运行${NC}"
    exit 1
fi

# 检查是否已登录 Docker Hub
echo -e "${YELLOW}检查 Docker Hub 登录状态...${NC}"
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}请先登录 Docker Hub:${NC}"
    echo "docker login"
    read -p "是否现在登录? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker login
    else
        echo -e "${RED}需要登录 Docker Hub 才能推送镜像${NC}"
        exit 1
    fi
fi

# 检查 buildx 是否可用
echo -e "${YELLOW}检查 Docker Buildx...${NC}"
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}错误: Docker Buildx 不可用${NC}"
    echo "请确保 Docker 版本支持 buildx (Docker 19.03+)"
    exit 1
fi

# 创建并使用 buildx builder
echo -e "${YELLOW}设置 buildx builder...${NC}"
BUILDER_NAME="multiarch-builder"

# 检查 builder 是否已存在
if docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo "使用现有的 builder: $BUILDER_NAME"
    docker buildx use $BUILDER_NAME
else
    echo "创建新的 builder: $BUILDER_NAME"
    docker buildx create --name $BUILDER_NAME --use --platform linux/amd64,linux/arm64
fi

# 启动 builder
echo -e "${YELLOW}启动 builder...${NC}"
docker buildx inspect --bootstrap

# 检查 Dockerfile 是否存在
if [ ! -f "$DOCKERFILE_PATH" ]; then
    echo -e "${RED}错误: Dockerfile 不存在: $DOCKERFILE_PATH${NC}"
    exit 1
fi

# 检查构建上下文是否存在
if [ ! -d "$BUILD_CONTEXT" ]; then
    echo -e "${RED}错误: 构建上下文目录不存在: $BUILD_CONTEXT${NC}"
    exit 1
fi

# 检查必要的源文件
echo -e "${YELLOW}检查源文件...${NC}"
required_files=(
    "../smart-meter/extern/rdb.tar.gz"
    "../smart-meter/extern/tsdb.tar.gz"
    "./client/package.json"
    "./server/package.json"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}错误: 必需文件不存在: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}所有必需文件检查通过${NC}"

# 获取版本标签
echo -e "${YELLOW}设置版本标签...${NC}"
if [ -n "$1" ]; then
    VERSION_TAG="$1"
else
    # 尝试从 git 获取版本
    if git rev-parse --git-dir > /dev/null 2>&1; then
        VERSION_TAG=$(git describe --tags --always --dirty 2>/dev/null || git rev-parse --short HEAD)
    else
        VERSION_TAG="latest"
    fi
fi

echo -e "${BLUE}版本标签: $VERSION_TAG${NC}"

# 构建镜像标签
IMAGE_TAGS=(
    "$IMAGE_NAME:$VERSION_TAG"
    "$IMAGE_NAME:latest"
)

# 构建标签参数
TAG_ARGS=""
for tag in "${IMAGE_TAGS[@]}"; do
    TAG_ARGS="$TAG_ARGS -t $tag"
done

echo -e "${YELLOW}开始多架构构建...${NC}"
echo -e "${BLUE}构建上下文: $BUILD_CONTEXT${NC}"
echo -e "${BLUE}Dockerfile: $DOCKERFILE_PATH${NC}"
echo -e "${BLUE}架构: linux/amd64,linux/arm64${NC}"
echo -e "${BLUE}标签: ${IMAGE_TAGS[*]}${NC}"
echo ""

# 执行构建和推送
echo -e "${GREEN}执行构建命令...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --file "$DOCKERFILE_PATH" \
    $TAG_ARGS \
    --push \
    "$BUILD_CONTEXT"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== 构建成功! ===${NC}"
    echo -e "${GREEN}镜像已推送到 Docker Hub:${NC}"
    for tag in "${IMAGE_TAGS[@]}"; do
        echo -e "${GREEN}  - $tag${NC}"
    done
    echo ""
    echo -e "${BLUE}使用方法:${NC}"
    echo "  docker run -d --name smart-meter -p 3001:3001 $IMAGE_NAME:$VERSION_TAG"
    echo ""
    echo -e "${BLUE}验证多架构支持:${NC}"
    echo "  docker buildx imagetools inspect $IMAGE_NAME:$VERSION_TAG"
else
    echo -e "${RED}构建失败!${NC}"
    exit 1
fi

# 清理 builder (可选)
read -p "是否删除临时 builder? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker buildx rm $BUILDER_NAME
    echo -e "${GREEN}Builder 已删除${NC}"
fi

echo -e "${GREEN}脚本执行完成!${NC}"