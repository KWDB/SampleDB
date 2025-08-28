const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
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
    'http://127.0.0.1:5174',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  credentials: true
}));

// Serve static files from client build directory
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  console.log('Serving static files from:', clientBuildPath);
} else {
  console.log('Client build directory not found:', clientBuildPath);
}
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

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes and WebSocket routes
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Client build not found. Please run "npm run build" first.' });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 智能电表API服务器运行在 http://localhost:${PORT}/api/`);
  console.log(`📊 WebSocket服务已启动`);
  console.log(`🔗 Frontend and backend merged on http://localhost:${PORT}`);
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