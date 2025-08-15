const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const { KWDBConnection } = require('./utils/database');
const queryRoutes = require('./routes/query');
const databaseRoutes = require('./routes/database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化数据库连接
const db = new KWDBConnection();

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// 将数据库实例添加到请求对象
app.use((req, res, next) => {
  req.db = db;
  next();
});

// 路由
app.use('/api/query', queryRoutes);
app.use('/api/database', databaseRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await db.testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// WebSocket连接处理（保留基础连接功能）
wss.on('connection', (ws) => {
  console.log('WebSocket客户端已连接');
  
  ws.on('close', () => {
    console.log('WebSocket客户端已断开');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// 错误处理中间件
app.use((error, req, res, _next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 智能电表API服务器运行在端口 ${PORT}`);
  console.log(`📊 WebSocket服务已启动`);
  console.log(`🔗 客户端地址: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close();
    process.exit(0);
  });
});