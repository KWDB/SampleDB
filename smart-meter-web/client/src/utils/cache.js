import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { api } from '../services/api'

// 创建本地存储持久化器
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'smart-meter-cache',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
})

// 导出持久化器创建函数
export const createPersister = () => localStoragePersister

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 实时数据 - 短缓存时间
  realtime: {
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分钟 (替代cacheTime)
    refetchInterval: 30 * 1000, // 30秒自动刷新
    refetchOnWindowFocus: true,
    retry: 2,
  },
  
  // 仪表盘数据 - 中等缓存时间
  dashboard: {
    staleTime: 2 * 60 * 1000, // 2分钟
    gcTime: 10 * 60 * 1000, // 10分钟
    refetchInterval: 2 * 60 * 1000, // 2分钟自动刷新
    refetchOnWindowFocus: true,
    retry: 3,
  },
  
  // 可视化数据 - 中等缓存时间
  visualization: {
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 15 * 60 * 1000, // 15分钟
    refetchOnWindowFocus: false,
    retry: 2,
  },
  
  // 静态数据 - 长缓存时间
  static: {
    staleTime: 30 * 60 * 1000, // 30分钟
    gcTime: 60 * 60 * 1000, // 1小时
    refetchOnWindowFocus: false,
    retry: 1,
  },
  
  // 配置数据 - 很长缓存时间
  config: {
    staleTime: 60 * 60 * 1000, // 1小时
    gcTime: 24 * 60 * 60 * 1000, // 24小时
    refetchOnWindowFocus: false,
    retry: 1,
  },
}

// 创建优化的QueryClient
export const createOptimizedQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // 根据错误类型决定重试策略
          if (error?.response?.status === 404) return false
          if (error?.response?.status >= 500) return failureCount < 3
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5 * 60 * 1000, // 默认5分钟
        gcTime: 10 * 60 * 1000, // 默认10分钟
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // 网络恢复时重新获取
        networkMode: 'online',
      },
      mutations: {
        retry: 1,
        networkMode: 'online',
      },
    },
  })

  // 启用持久化缓存
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    buster: '1.0.0', // 版本号，用于缓存失效
  })

  return queryClient
}

// 查询键工厂
export const queryKeys = {
  // 仪表盘相关
  dashboard: {
    all: ['dashboard'],
    data: () => [...queryKeys.dashboard.all, 'data'],
    stats: () => [...queryKeys.dashboard.all, 'stats'],
  },
  
  // 可视化相关
  visualization: {
    all: ['visualization'],
    regionPowerPie: (hours) => [...queryKeys.visualization.all, 'region-power-pie', hours],
    powerTrend: (hours, interval) => [...queryKeys.visualization.all, 'power-trend', hours, interval],
    meterStatus: () => [...queryKeys.visualization.all, 'meter-status'],
    heatmap: (hours) => [...queryKeys.visualization.all, 'heatmap', hours],
    gaugeData: () => [...queryKeys.visualization.all, 'gauge'],
    meterDetail: (meterId, hours) => [...queryKeys.visualization.all, 'meter-detail', meterId, hours],
  },
  
  // 查询相关
  query: {
    all: ['query'],
    scenarios: () => [...queryKeys.query.all, 'scenarios'],
    history: () => [...queryKeys.query.all, 'history'],
    meters: () => [...queryKeys.query.all, 'meters'],
    areas: () => [...queryKeys.query.all, 'areas'],
  },
  
  // 数据库相关
  database: {
    all: ['database'],
    status: () => [...queryKeys.database.all, 'status'],
    config: () => [...queryKeys.database.all, 'config'],
    stats: () => [...queryKeys.database.all, 'stats'],
    schema: (database) => [...queryKeys.database.all, 'schema', database],
    tableData: (database, tableName, page, pageSize) => [
      ...queryKeys.database.all, 'table-data', database, tableName, page, pageSize
    ],
  },
}

// 缓存策略应用函数
export const applyCacheStrategy = (strategy) => {
  return CACHE_STRATEGIES[strategy] || CACHE_STRATEGIES.static
}

// 预加载数据函数
export const preloadData = async (queryClient) => {
  const preloadQueries = [
    // 预加载仪表盘数据
    {
      queryKey: queryKeys.dashboard.data(),
      queryFn: () => api.visualization.getDashboard(),
      ...applyCacheStrategy('dashboard'),
    },
    // 预加载电表列表
    {
      queryKey: queryKeys.query.meters(),
      queryFn: () => api.query.getMeters(),
      ...applyCacheStrategy('static'),
    },
    // 预加载区域列表
    {
      queryKey: queryKeys.query.areas(),
      queryFn: () => api.query.getAreas(),
      ...applyCacheStrategy('static'),
    },
  ]

  // 并行预加载
  await Promise.allSettled(
    preloadQueries.map(query => queryClient.prefetchQuery(query))
  )
}

// 缓存失效工具函数
export const invalidateCache = {
  // 失效所有仪表盘缓存
  dashboard: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  },
  
  // 失效所有可视化缓存
  visualization: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.visualization.all })
  },
  
  // 失效特定时间范围的数据
  timeRangeData: (queryClient, hours) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.visualization.regionPowerPie(hours) 
    })
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.visualization.powerTrend(hours) 
    })
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.visualization.heatmap(hours) 
    })
  },
  
  // 失效所有缓存
  all: (queryClient) => {
    queryClient.invalidateQueries()
  },
}

// 本地存储工具函数
export const localStorage = {
  // 保存用户偏好设置
  savePreferences: (preferences) => {
    try {
      window.localStorage.setItem('smart-meter-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.warn('保存用户偏好失败:', error)
    }
  },
  
  // 获取用户偏好设置
  getPreferences: () => {
    try {
      const preferences = window.localStorage.getItem('smart-meter-preferences')
      return preferences ? JSON.parse(preferences) : {}
    } catch (error) {
      console.warn('获取用户偏好失败:', error)
      return {}
    }
  },
  
  // 保存查询历史
  saveQueryHistory: (query) => {
    try {
      const history = localStorage.getQueryHistory()
      const newHistory = [query, ...history.slice(0, 49)] // 保留最近50条
      window.localStorage.setItem('smart-meter-query-history', JSON.stringify(newHistory))
    } catch (error) {
      console.warn('保存查询历史失败:', error)
    }
  },
  
  // 获取查询历史
  getQueryHistory: () => {
    try {
      const history = window.localStorage.getItem('smart-meter-query-history')
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.warn('获取查询历史失败:', error)
      return []
    }
  },
  
  // 清理过期缓存
  cleanExpiredCache: () => {
    try {
      const keys = Object.keys(window.localStorage)
      const expiredKeys = keys.filter(key => {
        if (key.startsWith('smart-meter-cache-')) {
          const item = window.localStorage.getItem(key)
          if (item) {
            const data = JSON.parse(item)
            const expireTime = data.timestamp + (24 * 60 * 60 * 1000) // 24小时过期
            return Date.now() > expireTime
          }
        }
        return false
      })
      
      expiredKeys.forEach(key => window.localStorage.removeItem(key))
      console.log(`清理了 ${expiredKeys.length} 个过期缓存项`)
    } catch (error) {
      console.warn('清理过期缓存失败:', error)
    }
  },
}

// 网络状态监听
export const setupNetworkListener = (queryClient) => {
  const handleOnline = () => {
    console.log('网络已连接，重新获取数据')
    queryClient.resumePausedMutations()
    queryClient.invalidateQueries()
  }
  
  const handleOffline = () => {
    console.log('网络已断开')
  }
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// 初始化缓存函数
export const initializeCache = async (queryClient) => {
  // 清理过期缓存
  localStorage.cleanExpiredCache()
  
  // 设置网络监听
  setupNetworkListener(queryClient)
  
  // 预加载关键数据
  try {
    await preloadData(queryClient)
    console.log('缓存初始化完成')
  } catch (error) {
    console.warn('预加载数据失败:', error)
  }
}