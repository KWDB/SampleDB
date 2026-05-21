#!/bin/bash

# 初始化随机数种子
RANDOM=$$$(date +%s)

# 初始化时间戳
START_TIME=$(date +%s)  # 获取当前时间戳

if date -d "@0" "+%Y-%m-%d %H:%M:%S" >/dev/null 2>&1; then
    DATE_STYLE="gnu"
elif date -r 0 "+%Y-%m-%d %H:%M:%S" >/dev/null 2>&1; then
    DATE_STYLE="bsd"
else
    echo "错误: 当前系统 date 命令不支持按 epoch 格式化时间" >&2
    exit 1
fi

format_timestamp() {
    local epoch=$1

    if [ "$DATE_STYLE" = "gnu" ]; then
        date -d "@$epoch" "+%Y-%m-%d %H:%M:%S"
    else
        date -r "$epoch" "+%Y-%m-%d %H:%M:%S"
    fi
}

# 高效随机字符串生成
rand_str() {
    LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | head -c1
}

# 默认参数
DEFAULT_OUTPUT_PATH="kwbase-data"

# 如果有传入参数，就使用传入的参数，否则使用默认参数
DEFAULT_PATH=${1:-$DEFAULT_OUTPUT_PATH}

# 单表生成函数
generate_csv() {
    # 预生成基准数据
    local branch_arr=()
    local site_arr=()
    local region_arr=()
    local pipe_arr=()
    local point_arr=()
    local i
    local output

    for ((i=1; i<=8; i++)); do
        branch_arr+=("branch_$i")
    done
    for ((i=1; i<=436; i++)); do
        site_arr+=("site_$i")
    done
    for ((i=1; i<=41; i++)); do
        region_arr+=("region_$i")
    done
    for ((i=1; i<=26; i++)); do
        pipe_arr+=("pipe_$i")
    done
    for ((i=1; i<=1500; i++)); do
        point_arr+=("point_$i")
    done

    local table=$1
    mkdir -p "$DEFAULT_PATH/extern"
    
    case $table in
        operation_branch)
        output="$DEFAULT_PATH/extern/operation_branch/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/operation_branch"
            for com in "${branch_arr[@]}"; do
                printf "%s,Company_%s,Desc_%s\n" \
                    "$com" "$(rand_str)" "$(rand_str)"
            done > "$output"
            echo "成功生成关系表${table}的数据,输出到$output"
            ;;
        site_info)
        output="$DEFAULT_PATH/extern/site_info/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/site_info"
            for sn in "${site_arr[@]}"; do
                printf "%s,Station_%s,%s,%s,Loc_%s,Desc_%s\n" \
                    "$sn" "$(rand_str)" \
                    "${region_arr[RANDOM%41]}" \
                    "${branch_arr[RANDOM%8]}" \
                    "$(rand_str)" "$(rand_str)"
            done > "$output"
            echo "成功生成关系表${table}的数据,输出到$output"
            ;;
        region_info)
        output="$DEFAULT_PATH/extern/region_info/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/region_info"
            i=1
            for area in "${region_arr[@]}"; do
                printf "%s,Area_%s,Loc_%s,Desc_%s\n" \
                    "$area" "$i" \
                    "$(rand_str)" "$(rand_str)"
                    ((i++))
            done > "$output"
            echo "成功生成关系表${table}的数据,输出到$output"
            ;;
        pipeline_info)
        output="$DEFAULT_PATH/extern/pipeline_info/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/pipeline_info"
            i=1
            for pipe in "${pipe_arr[@]}"; do
                printf "%s,Pipe_%s,Start_%s,End_%s,Prop_%s\n" \
                    "$pipe" "$i" \
                    "$(rand_str)" "$(rand_str)" "$(rand_str)"
                    ((i++))
            done > "$output"
            echo "成功生成关系表${table}的数据,输出到$output"
            ;;
        point_base_info)
        output="$DEFAULT_PATH/extern/point_base_info/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/point_base_info"
            for point in "${point_arr[@]}"; do
                printf "%s,SIG_%s,Desc_%s,%d,%s,%s\n" \
                    "$point" "$(rand_str)" \
                    "$(rand_str)" $((RANDOM%10+1)) \
                    "${site_arr[RANDOM%436]}" \
                    "${pipe_arr[RANDOM%26]}"
            done > "$output"
            echo "成功生成关系表${table}的数据,输出到$output"
            ;;
        t_monitor_point)
        output="$DEFAULT_PATH/extern/t_monitor_point/${table}.csv"
        mkdir -p "$DEFAULT_PATH/extern/t_monitor_point"
            for ((i=1; i<=10000; i++)); do
                printf "%s,%d,%s,%s,%s,%s,%s,%d,%d\n" \
                   "$(format_timestamp "$((START_TIME + i))")" \
                    $((RANDOM%1000)) \
                    "${point_arr[RANDOM%1500]}" \
                    "${branch_arr[RANDOM%8]}" \
                    "${region_arr[RANDOM%41]}" \
                    "${site_arr[RANDOM%436]}" \
                    "${pipe_arr[RANDOM%26]}" \
                    $((RANDOM%10+1)) \
                    $((RANDOM%100))
            done > "$output"
            echo "成功生成时序表${table}的数据,输出到$output"
            ;;
    esac
}

export DEFAULT_PATH START_TIME DATE_STYLE
export -f generate_csv rand_str format_timestamp
    
# 并行模式（需要parallel命令支持）
if command -v parallel &>/dev/null; then
    tables=("t_monitor_point" "site_info" "region_info" "operation_branch" "pipeline_info" "point_base_info")
    parallel generate_csv ::: "${tables[@]}"
    echo "并行模式执行完成"
else
    echo "未安装GNU parallel,自动切换为串行模式,建议安装parallel：sudo apt install parallel"
    generate_csv site_info
    generate_csv region_info
    generate_csv pipeline_info
    generate_csv operation_branch
    generate_csv point_base_info
    generate_csv t_monitor_point
fi
