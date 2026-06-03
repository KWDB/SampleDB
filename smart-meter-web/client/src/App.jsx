import React, { useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Database,
  Search,
  Zap
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from './services/api'
// 使用懒加载组件替代直接导入
import {
  LazyQueryCenter,
  LazyDatabaseManagement
} from './components/LazyComponents'
import { useSmartPreload } from './hooks/useSmartPreload'
import { useNetworkStatus } from './hooks/useNetworkStatus'

import ErrorBoundary from './components/ErrorBoundary'
import { NetworkWrapper } from './components/OfflineSupport'
import { Spinner } from './components/ui'

import './App.css'

function App() {
  const location = useLocation()
  const { isOnline } = useNetworkStatus()
  const { preloadRoute } = useSmartPreload(['/query', '/database'])

  // 检查数据库连接状态 - 设置为可选，不阻塞页面渲染
  const {
    data: dbStatus,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
    refetch: refetchDatabaseStatus
  } = useQuery({
    queryKey: ['database-status'],
    queryFn: api.database.getStatus,
    refetchInterval: 30000, // 每30秒检查一次
    retry: 1, // 减少重试次数
    enabled: isOnline, // 在线时立即检查，查询不会阻塞页面渲染
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1分钟内不重复请求
  })

  const activeKey = location.pathname.includes('/query') ? 'query' : 'database'

  // 顶部学习路径配置
  const navigationItems = [
    {
      key: 'database',
      icon: <Database size={16} />,
      label: '概览',
      path: '/',
    },
    {
      key: 'query',
      icon: <Search size={16} />,
      label: '示例 SQL 查询',
      path: '/query',
    },
  ]

  const getShellStatus = () => {
    if (!isOnline) {
      return {
        className: 'warning',
        icon: <AlertTriangle size={15} />,
        title: '离线模式',
        detail: '网络不可用'
      }
    }

    if (dbLoading || dbFetching) {
      return {
        className: 'pending',
        icon: <Spinner size="small" />,
        title: '检查连接',
        detail: '正在读取 KWDB 状态'
      }
    }

    if (dbStatus?.data?.connected) {
      return {
        className: 'success',
        icon: <CheckCircle2 size={15} />,
        title: 'KWDB 已连接',
        detail: 'RDB 与 TSDB 可用'
      }
    }

    if (dbError) {
      return {
        className: 'error',
        icon: <CircleX size={15} />,
        title: '连接失败',
        detail: '点击重试'
      }
    }

    return {
      className: 'warning',
      icon: <AlertTriangle size={15} />,
      title: '未检查连接',
      detail: '点击检查'
    }
  }

  const shellStatus = getShellStatus()

  // 根据当前路径智能预加载另一条学习路径
  useEffect(() => {
    if (activeKey === 'query') {
      preloadRoute('/database')
    } else {
      preloadRoute('/query')
    }
  }, [activeKey, preloadRoute])

  // 手动触发数据库状态检查
  const checkDatabaseStatus = useCallback(() => {
    refetchDatabaseStatus()
  }, [refetchDatabaseStatus])

  return (
    <ErrorBoundary>
      <NetworkWrapper>
        <div className="app-layout">
          <header className="app-header">
            <div className="app-header-inner">
              <NavLink to="/" className="app-brand" aria-label="打开智能电表示例概览">
                <span className="app-brand-mark" aria-hidden="true">
                  <Zap className="app-brand-icon" size={16} />
                </span>
                <span className="app-brand-copy">
                  <span className="app-brand-title">智能电表示例</span>
                  <span className="app-brand-subtitle">KWDB Sample</span>
                </span>
              </NavLink>

              <nav className="app-top-nav" aria-label="学习路径">
                {navigationItems.map(item => {
                  const isSelected = activeKey === item.key
                  const preloadPath = item.key === 'database' ? '/database' : item.path

                  return (
                    <NavLink
                      key={item.key}
                      to={item.path}
                      end={item.key === 'database'}
                      className={`app-nav-item ${isSelected ? 'is-selected' : ''}`}
                      aria-current={isSelected ? 'page' : undefined}
                      onMouseEnter={() => preloadRoute(preloadPath)}
                      onFocus={() => preloadRoute(preloadPath)}
                    >
                      <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="app-nav-label">{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              <button
                type="button"
                className={`db-status db-status-${shellStatus.className}`}
                onClick={checkDatabaseStatus}
                aria-label={`${shellStatus.title}，${shellStatus.detail}`}
              >
                <span className="db-status-icon" aria-hidden="true">{shellStatus.icon}</span>
                <span className="db-status-copy">
                  <span className="db-status-title">{shellStatus.title}</span>
                  <span className="db-status-detail">{shellStatus.detail}</span>
                </span>
              </button>
            </div>
          </header>

          <main className="app-content">
            <Routes>
              <Route path="/" element={<LazyDatabaseManagement />} />
              <Route path="/query" element={<LazyQueryCenter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </NetworkWrapper>
    </ErrorBoundary>
  )
}

export default App
