#!/bin/bash

# 多架构构建和推送脚本
# 支持 amd64 和 arm64 架构

set -e

# 配置变量
DEFAULT_IMAGE_NAMES=(
    "kwdb/smart-meter"
    "ghcr.io/kwdb/smart-meter"
    "registry.cn-hangzhou.aliyuncs.com/kwdb/smart-meter"
)
DOCKERFILE_PATH="./Dockerfile"
BUILD_CONTEXT="../"  # 构建上下文为上级目录，因为需要访问 smart-meter/ 目录
AUTO_LATEST=true

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_usage() {
    cat <<EOF
用法:
  $0 [版本标签]
  $0 --tag <tag> [--tag <tag> ...]

选项:
  -t, --tag <tag>       指定 Docker tag，可重复传入多个 tag
      --tags <tags>     指定逗号分隔的 Docker tag 列表
      --image <image>   指定镜像仓库，可重复传入；指定后覆盖默认仓库
      --images <images> 指定逗号分隔的镜像仓库列表；指定后覆盖默认仓库
      --no-latest       使用自动/位置参数标签时，不额外打 latest
  -h, --help            显示帮助信息

环境变量:
  DOCKER_TAG=<tag>          指定单个 Docker tag
  DOCKER_TAGS=<tag1,tag2>   指定多个 Docker tag
  IMAGE_NAME=<image>        指定单个镜像仓库，覆盖默认仓库
  IMAGE_NAMES=<img1,img2>   指定多个镜像仓库，覆盖默认仓库

默认镜像仓库:
  ${DEFAULT_IMAGE_NAMES[*]}

示例:
  $0 v1.0.0
  $0 --tag v1.0.0 --tag latest
  $0 --tag v1.0.0 --image ghcr.io/kwdb/smart-meter
  DOCKER_TAGS=v1.0.0,latest $0
EOF
}

error_exit() {
    echo -e "${RED}错误: $1${NC}" >&2
    exit 1
}

registry_credentials_configured() {
    local registry="$1"
    local config_file="${DOCKER_CONFIG:-$HOME/.docker}/config.json"

    if [ ! -f "$config_file" ]; then
        return 1
    fi

    if grep -Fq "\"$registry\"" "$config_file"; then
        return 0
    fi

    if [ "$registry" = "docker.io" ] && grep -Fq "\"https://index.docker.io/v1/\"" "$config_file"; then
        return 0
    fi

    if grep -Eq '"(credsStore|credHelpers)"' "$config_file"; then
        return 0
    fi

    return 1
}

trim() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

CLI_TAGS=()
CLI_IMAGES=()
TARGET_IMAGES=()
POSITIONAL_TAG=""

add_cli_tag() {
    local tag
    tag=$(trim "$1")
    if [ -z "$tag" ]; then
        error_exit "Docker tag 不能为空"
    fi
    CLI_TAGS+=("$tag")
}

add_cli_tags_csv() {
    local csv="$1"
    local old_ifs="$IFS"
    local parts
    local part

    IFS=','
    read -r -a parts <<< "$csv"
    IFS="$old_ifs"

    for part in "${parts[@]}"; do
        add_cli_tag "$part"
    done
}

add_cli_image() {
    local image
    image=$(trim "$1")
    if [ -z "$image" ]; then
        error_exit "镜像仓库不能为空"
    fi
    if [[ "$image" =~ [[:space:]] ]]; then
        error_exit "镜像仓库不能包含空白字符: $image"
    fi
    CLI_IMAGES+=("$image")
}

add_cli_images_csv() {
    local csv="$1"
    local old_ifs="$IFS"
    local parts
    local part

    IFS=','
    read -r -a parts <<< "$csv"
    IFS="$old_ifs"

    for part in "${parts[@]}"; do
        add_cli_image "$part"
    done
}

add_target_image() {
    local image
    local existing_image

    image=$(trim "$1")
    if [ -z "$image" ]; then
        error_exit "镜像仓库不能为空"
    fi
    if [[ "$image" =~ [[:space:]] ]]; then
        error_exit "镜像仓库不能包含空白字符: $image"
    fi

    for existing_image in "${TARGET_IMAGES[@]}"; do
        if [ "$existing_image" = "$image" ]; then
            return
        fi
    done
    TARGET_IMAGES+=("$image")
}

add_target_images_csv() {
    local csv="$1"
    local old_ifs="$IFS"
    local parts
    local part

    IFS=','
    read -r -a parts <<< "$csv"
    IFS="$old_ifs"

    for part in "${parts[@]}"; do
        add_target_image "$part"
    done
}

image_registry() {
    local image="$1"
    local first_part="${image%%/*}"

    if [[ "$image" == */* ]] && [[ "$first_part" == *.* || "$first_part" == *:* || "$first_part" == "localhost" ]]; then
        printf '%s' "$first_part"
    else
        printf 'docker.io'
    fi
}

add_unique_registry() {
    local registry="$1"
    local existing_registry

    for existing_registry in "${TARGET_REGISTRIES[@]}"; do
        if [ "$existing_registry" = "$registry" ]; then
            return
        fi
    done
    TARGET_REGISTRIES+=("$registry")
}

check_registry_login() {
    local registry="$1"
    local login_command=("docker" "login")

    if [ "$registry" != "docker.io" ]; then
        login_command+=("$registry")
    fi

    if [ "$registry" = "docker.io" ] && docker info | grep -q "Username:"; then
        return
    fi

    if registry_credentials_configured "$registry"; then
        echo -e "${YELLOW}未从 docker info 检测到 ${registry} 用户名，但发现本地 Docker 凭据配置，将继续尝试推送${NC}"
        return
    fi

    echo -e "${YELLOW}请先登录镜像仓库 ${registry}:${NC}"
    echo "${login_command[*]}"
    read -p "是否现在登录 ${registry}? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "${login_command[@]}"
    else
        echo -e "${RED}需要登录 ${registry} 才能推送镜像${NC}"
        exit 1
    fi
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        -t|--tag)
            [ -n "${2:-}" ] || error_exit "$1 需要指定 tag"
            add_cli_tag "$2"
            shift 2
            ;;
        --tag=*)
            add_cli_tag "${1#*=}"
            shift
            ;;
        --tags)
            [ -n "${2:-}" ] || error_exit "$1 需要指定 tag 列表"
            add_cli_tags_csv "$2"
            shift 2
            ;;
        --tags=*)
            add_cli_tags_csv "${1#*=}"
            shift
            ;;
        --image)
            [ -n "${2:-}" ] || error_exit "$1 需要指定镜像名称"
            add_cli_image "$2"
            shift 2
            ;;
        --image=*)
            add_cli_image "${1#*=}"
            shift
            ;;
        --images)
            [ -n "${2:-}" ] || error_exit "$1 需要指定镜像仓库列表"
            add_cli_images_csv "$2"
            shift 2
            ;;
        --images=*)
            add_cli_images_csv "${1#*=}"
            shift
            ;;
        --no-latest)
            AUTO_LATEST=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            error_exit "未知参数: $1"
            ;;
        *)
            if [ -n "$POSITIONAL_TAG" ]; then
                error_exit "只能传入一个位置参数标签；多个标签请使用 --tag"
            fi
            POSITIONAL_TAG="$1"
            shift
            ;;
    esac
done

if [ "$#" -gt 0 ]; then
    error_exit "未知参数: $*"
fi

if [ "${#CLI_TAGS[@]}" -eq 0 ]; then
    if [ -n "${DOCKER_TAGS:-}" ]; then
        add_cli_tags_csv "$DOCKER_TAGS"
    elif [ -n "${DOCKER_TAG:-}" ]; then
        add_cli_tag "$DOCKER_TAG"
    fi
fi

if [ "${#CLI_IMAGES[@]}" -gt 0 ]; then
    for image in "${CLI_IMAGES[@]}"; do
        add_target_image "$image"
    done
elif [ -n "${IMAGE_NAMES:-}" ]; then
    add_target_images_csv "$IMAGE_NAMES"
elif [ -n "${IMAGE_NAME:-}" ]; then
    add_target_image "$IMAGE_NAME"
else
    for image in "${DEFAULT_IMAGE_NAMES[@]}"; do
        add_target_image "$image"
    done
fi

if [ "${#TARGET_IMAGES[@]}" -eq 0 ]; then
    error_exit "至少需要指定一个镜像仓库"
fi

echo -e "${BLUE}=== Docker 多架构构建脚本 ===${NC}"
echo -e "${BLUE}镜像仓库: ${TARGET_IMAGES[*]}${NC}"
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

# 检查是否已登录目标镜像仓库
echo -e "${YELLOW}检查镜像仓库登录状态...${NC}"
TARGET_REGISTRIES=()
for image in "${TARGET_IMAGES[@]}"; do
    add_unique_registry "$(image_registry "$image")"
done

for registry in "${TARGET_REGISTRIES[@]}"; do
    check_registry_login "$registry"
done

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

# 设置镜像标签
echo -e "${YELLOW}设置 Docker tag...${NC}"
IMAGE_TAGS=()
VERSION_TAG=""

add_image_tag() {
    local tag="$1"
    local image
    local image_tag
    local existing_tag

    if [[ ! "$tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
        error_exit "无效 Docker tag: $tag"
    fi

    for image in "${TARGET_IMAGES[@]}"; do
        image_tag="$image:$tag"
        for existing_tag in "${IMAGE_TAGS[@]}"; do
            if [ "$existing_tag" = "$image_tag" ]; then
                continue 2
            fi
        done
        IMAGE_TAGS+=("$image_tag")
    done
}

if [ "${#CLI_TAGS[@]}" -gt 0 ]; then
    VERSION_TAG="${CLI_TAGS[0]}"
    for tag in "${CLI_TAGS[@]}"; do
        add_image_tag "$tag"
    done
else
    if [ -n "$POSITIONAL_TAG" ]; then
        VERSION_TAG="$POSITIONAL_TAG"
    else
        # 尝试从 git 获取版本
        if git rev-parse --git-dir > /dev/null 2>&1; then
            VERSION_TAG=$(git describe --tags --always --dirty 2>/dev/null || git rev-parse --short HEAD)
        else
            VERSION_TAG="latest"
        fi
    fi

    add_image_tag "$VERSION_TAG"
    if [ "$AUTO_LATEST" = true ] && [ "$VERSION_TAG" != "latest" ]; then
        add_image_tag "latest"
    fi
fi

echo -e "${BLUE}Docker tag: ${IMAGE_TAGS[*]}${NC}"

# 构建标签参数
TAG_ARGS=()
for tag in "${IMAGE_TAGS[@]}"; do
    TAG_ARGS+=("-t" "$tag")
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
    "${TAG_ARGS[@]}" \
    --push \
    "$BUILD_CONTEXT"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== 构建成功! ===${NC}"
    echo -e "${GREEN}镜像已推送到目标仓库:${NC}"
    for tag in "${IMAGE_TAGS[@]}"; do
        echo -e "${GREEN}  - $tag${NC}"
    done
    echo ""
    echo -e "${BLUE}使用方法:${NC}"
    echo "  docker run -d --name smart-meter -p 3001:3001 ${IMAGE_TAGS[0]}"
    echo ""
    echo -e "${BLUE}验证多架构支持:${NC}"
    for image in "${TARGET_IMAGES[@]}"; do
        echo "  docker buildx imagetools inspect $image:$VERSION_TAG"
    done
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
