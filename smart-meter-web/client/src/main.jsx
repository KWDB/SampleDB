import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createOptimizedQueryClient, createPersister, initializeCache } from './utils/cache.js'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App.jsx'
import './index.css'

// 配置dayjs中文
dayjs.locale('zh-cn')

// 创建React Query客户端
const queryClient = createOptimizedQueryClient()
const persister = createPersister()

// 异步初始化缓存（不阻塞渲染）
initializeCache(queryClient).catch(error => {
  console.warn('缓存初始化失败:', error)
})

// Ant Design主题配置
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister }}
      >
        <ConfigProvider locale={zhCN} theme={theme}>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </ConfigProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)