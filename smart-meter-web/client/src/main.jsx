import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createOptimizedQueryClient, createPersister, initializeCache } from './utils/cache.js'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App.jsx'
import { AppProvider } from './components/ui'
import './index.css'

// 配置dayjs中文
dayjs.locale('zh-cn')

// 创建React Query客户端
const queryClient = createOptimizedQueryClient()
const persister = createPersister()
const showQueryDevtools = import.meta.env.VITE_QUERY_DEVTOOLS === 'true'

// 异步初始化缓存（不阻塞渲染）
initializeCache(queryClient).catch(error => {
  console.warn('缓存初始化失败:', error)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister }}
      >
        <AppProvider>
          <App />
          {showQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
        </AppProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
