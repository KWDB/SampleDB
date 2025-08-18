import axios from 'axios'
import { recordApiCall, recordError } from '../utils/performance'

// 获取基础URL
function getBaseURL() {
  // 检查是否在开发环境中（通过Vite开发服务器访问）
  const isDevelopment = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
                       (window.location.port === '5173' || window.location.port === '5174');
  
  if (isDevelopment) {
    // 开发环境，使用localhost:3001
    return 'http://localhost:3001/api';
  } else {
    // 生产环境或合并部署，使用相对路径
    return '/api';
  }
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {  
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求时间戳用于性能监控
    config.metadata = { startTime: Date.now() }
    
    console.log('API请求:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    recordError(error, { type: 'request_interceptor' })
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const endTime = Date.now()
    const startTime = response.config.metadata?.startTime || endTime
    
    // 记录API性能
    recordApiCall(
      response.config.url,
      response.config.method?.toUpperCase(),
      startTime,
      endTime,
      true
    )
    
    console.log('API响应:', response.config.url, response.status, `${endTime - startTime}ms`)
    return response.data
  },
  (error) => {
    const endTime = Date.now()
    const startTime = error.config?.metadata?.startTime || endTime
    
    // 记录API错误性能
    recordApiCall(
      error.config?.url || 'unknown',
      error.config?.method?.toUpperCase() || 'unknown',
      startTime,
      endTime,
      false,
      error
    )
    
    // 记录错误详情
    recordError(error, {
      type: 'api_error',
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      duration: endTime - startTime
    })
    
    console.error('响应错误:', error.response?.data || error.message)
    
    // 统一错误处理
    const errorMessage = error.response?.data?.message || error.message || '网络请求失败'
    
    return Promise.reject(new Error(errorMessage))
  }
)

// API接口定义
export const api = {
  // 查询相关接口
  query: {
    // 获取查询场景列表
    getScenarios: () => apiClient.get('/query/scenarios'),
    
    // 执行查询场景
    executeScenario: (scenarioKey, parameters = {}) => 
      apiClient.post(`/query/execute/${scenarioKey}`, { parameters }),
    
    // 执行自定义SQL
    executeCustom: (sql, database = 'mixed', parameters = []) => 
      apiClient.post('/query/custom', { sql, database, parameters }),
    
    // 获取查询历史
    getHistory: () => apiClient.get('/query/history'),
    
    // 获取电表列表
    getMeters: () => apiClient.get('/query/meters'),
    
    // 获取区域列表
    getAreas: () => apiClient.get('/query/areas'),
  },

  // 数据库管理接口
  database: {
    // 获取数据库状态
    getStatus: () => apiClient.get('/database/status'),
    
    // 获取数据库配置
    getConfig: () => apiClient.get('/database/config'),
    
    // 测试数据库连接
    testConnection: () => apiClient.post('/database/test'),
    
    // 获取数据库统计
    getStats: () => apiClient.get('/database/stats'),
    
    // 获取表结构
    getSchema: (database) => apiClient.get(`/database/schema/${database}`),
    
    // 检查数据导入状态
    getImportStatus: () => apiClient.get('/database/import-status'),
    
    // 获取数据库信息
    getInfo: () => apiClient.get('/database/info'),
    
    // 生成测试数据
    generateData: (count = 10000) => apiClient.post('/database/generate-data', { count }),
    
    // 获取表数据
    getTableData: (database, tableName, page = 1, pageSize = 50) => 
      apiClient.get(`/database/table-data/${database}/${tableName}`, { 
        params: { page, pageSize } 
      }),
  },



  // 系统健康检查
  health: {
    check: () => apiClient.get('/health'),
  },
}



// 导出默认实例
export default api