# 第一阶段：构建前端应用
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# 复制客户端 package.json 和 package-lock.json
COPY smart-meter-web/client/package*.json ./

# 安装客户端依赖（包含开发依赖用于构建）
RUN npm ci

# 复制客户端源代码
COPY smart-meter-web/client/ ./

# 构建前端应用
RUN npm run build

# 第二阶段：准备服务器应用
FROM node:18-alpine AS server-builder

WORKDIR /app/server

# 复制服务器 package.json 和 package-lock.json
COPY smart-meter-web/server/package*.json ./

# 安装服务器依赖（仅生产环境）
RUN npm ci --only=production

# 复制服务器源代码
COPY smart-meter-web/server/ ./

# 第三阶段：创建包含数据的KWDB镜像
FROM kwdb/kwdb:latest AS kwdb-with-data

# 复制数据文件到容器中
COPY smart-meter/extern/rdb.tar.gz /tmp/
COPY smart-meter/extern/tsdb.tar.gz /tmp/

# 创建数据导入脚本
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting KWDB for data import..."\n\
# 使用随机端口避免多架构构建时的端口冲突\n\
SQL_PORT=$((26257 + RANDOM % 1000))\n\
HTTP_PORT=$((8080 + RANDOM % 1000))\n\
echo "Using SQL port: $SQL_PORT, HTTP port: $HTTP_PORT"\n\
/kaiwudb/bin/kwbase start-single-node --insecure --host=0.0.0.0 --port=$SQL_PORT --http-port=$HTTP_PORT --store=path=/kwdb-data --background\n\
echo "Waiting for KWDB to start..."\n\
sleep 10\n\
while ! /kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -e "SELECT 1;" > /dev/null 2>&1; do\n\
    echo "Waiting for KWDB to be ready..."\n\
    sleep 2\n\
done\n\
echo "KWDB is ready for data import!"\n\
echo "Preparing for data import..."\n\
mkdir -p /kwdb-data/extern\n\
cd /kwdb-data/extern\n\
tar xf /tmp/rdb.tar.gz\n\
tar xf /tmp/tsdb.tar.gz\n\
echo "Dropping existing databases if they exist..."\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -e "DROP DATABASE IF EXISTS rdb;"\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -e "DROP DATABASE IF EXISTS tsdb;"\n\
echo "Importing rdb data..."\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -e "import database csv data (\"nodelocal://1/rdb\");"\n\
echo "Importing tsdb data..."\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -e "import database csv data (\"nodelocal://1/tsdb\");"\n\
echo "Verifying data import..."\n\
echo "RDB tables:"\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -d rdb -e "show tables;"\n\
echo "TSDB tables:"\n\
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=$SQL_PORT -d tsdb -e "show tables;"\n\
echo "Data import completed! Stopping KWDB..."\n\
pkill kwbase || true\n\
sleep 5\n\
echo "Data import stage finished!"' > /import-data.sh && chmod +x /import-data.sh

# 执行数据导入
RUN /import-data.sh

# 第四阶段：最终运行镜像
FROM kwdb/kwdb:latest

# 设置工作目录
WORKDIR /app

# 安装 Node.js 和必要工具
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制编译后的客户端文件到正确的目录结构
COPY --from=client-builder /app/client/dist /app/client/dist

# 从构建阶段复制服务器文件和依赖
COPY --from=server-builder /app/server /app/server

# 从数据导入阶段复制已导入数据的KWDB存储目录
COPY --from=kwdb-with-data /kwdb-data /kwdb-data

# 创建启动脚本
COPY <<EOF /app/start.sh
#!/bin/bash
set -e

# 启动 KWDB（使用预先导入数据的存储目录）
echo "Starting KWDB with pre-imported data..."
/kaiwudb/bin/kwbase start-single-node --insecure --host=0.0.0.0 --port=26257 --http-port=8080 --store=path=/kwdb-data --background

# 等待 KWDB 启动
echo "Waiting for KWDB to start..."
sleep 10

# 检查 KWDB 是否启动成功
while ! /kaiwudb/bin/kwbase sql --insecure --host=localhost --port=26257 -e "SELECT 1;" > /dev/null 2>&1; do
    echo "Waiting for KWDB to be ready..."
    sleep 2
done

echo "KWDB is ready with pre-imported data!"

# 验证数据是否存在
echo "Verifying pre-imported data..."
echo "RDB tables:"
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=26257 -d rdb -e "show tables;"
echo "TSDB tables:"
/kaiwudb/bin/kwbase sql --insecure --host=localhost --port=26257 -d tsdb -e "show tables;"
echo "Data verification completed!"

# 设置环境变量
export KWDB_HOST=localhost
export KWDB_PORT=26257
export KWDB_USER=root
export KWDB_PASSWORD=
export KWDB_SSL=false
export PORT=3001
export NODE_ENV=production

# 启动合并后的服务器（提供前后端服务）
echo "Starting smart-meter unified server..."
cd /app/server
node index.js
EOF

# 给启动脚本执行权限
RUN chmod +x /app/start.sh

# 暴露端口 - 只暴露统一的服务端口，KWDB 仅供容器内部访问
EXPOSE 3001

# 设置启动命令
CMD ["/app/start.sh"]