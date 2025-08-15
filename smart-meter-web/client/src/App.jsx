import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Spin, App as AntdApp } from 'antd'
import {
  DatabaseOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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



import './App.css'

const { Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedKey, setSelectedKey] = useState('database')
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useNetworkStatus()
  const { preloadRoute } = useSmartPreload(['/query', '/database'])
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  // 检查数据库连接状态 - 设置为可选，不阻塞页面渲染
  const { data: dbStatus, isLoading: dbLoading, error: dbError } = useQuery({
    queryKey: ['database-status'],
    queryFn: api.database.getStatus,
    refetchInterval: 30000, // 每30秒检查一次
    retry: 1, // 减少重试次数
    enabled: false, // 默认不启用，避免阻塞页面
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1分钟内不重复请求
  })

  // 菜单项配置
  const menuItems = [
    {
      key: 'database',
      icon: <DatabaseOutlined />,
      label: '概览',
      style: { textAlign: 'center' },
    },
    {
      key: 'query',
      icon: <SearchOutlined />,
      label: '示例SQL查询',
      style: { textAlign: 'center' },
    },

  ]

  // 根据路径设置选中的菜单项并智能预加载
  useEffect(() => {
    const path = location.pathname
    if (path.includes('/query')) {
      setSelectedKey('query')
      // 预加载可能访问的其他页面
      preloadRoute('/database')
    } else {
      setSelectedKey('database')
      // 预加载最常访问的页面
      preloadRoute('/query')
    }
  }, [location.pathname, preloadRoute])

  const queryClient = useQueryClient()

  // 手动触发数据库状态检查
  const checkDatabaseStatus = useCallback(() => {
    // 手动启用并重新获取数据库状态
    queryClient.invalidateQueries({ queryKey: ['database-status'] })
    queryClient.refetchQueries({ queryKey: ['database-status'] })
  }, [queryClient])

  // 在组件挂载时尝试检查数据库状态（非阻塞）
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDatabaseStatus()
    }, 1000) // 延迟1秒后检查，确保页面已渲染
    
    return () => clearTimeout(timer)
  }, [checkDatabaseStatus])

  return (
    <ErrorBoundary>
      <NetworkWrapper>
        <AntdApp>
          <Layout className="app-layout">
      {/* 侧边栏 */}
      <Sider 
        collapsed={collapsed} 
        theme="dark"
        width={250}
        className="app-sider"
      >
        <div className="logo">
          <ThunderboltOutlined className="logo-icon" />
          {!collapsed && <span className="logo-text">智能电表示例</span>}
        </div>
        
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => {
            setSelectedKey(key)
            // React Router导航
            const routes = {
              database: '/',
              query: '/query',

            }
            navigate(routes[key])
          }}
        />
        
        {/* 数据库状态指示器 */}
        <div className="db-status">
          {!isOnline ? (
            <div className="status-offline">
              <div className="status-dot warning" />
              <span>离线模式</span>
            </div>
          ) : dbLoading ? (
            <div className="status-connecting">
              <Spin size="small" />
              <span>检查中...</span>
            </div>
          ) : dbStatus?.data?.connected ? (
            <div className="status-connected">
              <div className="status-dot success" />
              <span>KWDB已连接</span>
            </div>
          ) : dbError ? (
            <div className="status-disconnected" onClick={checkDatabaseStatus} style={{ cursor: 'pointer' }}>
              <div className="status-dot error" />
              <span>点击重试</span>
            </div>
          ) : (
            <div className="status-unknown" onClick={checkDatabaseStatus} style={{ cursor: 'pointer' }}>
              <div className="status-dot warning" />
              <span>点击检查</span>
            </div>
          )}
        </div>
        
        {/* 菜单切换按钮 - 移动到底部 */}
        <div className="menu-toggle">
          <button
            type="button"
            className="ant-btn ant-btn-text ant-btn-icon-only"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: '100%',
              height: '48px',
              color: '#fff',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '16px'
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>
      </Sider>

      {/* 主内容区 */}
      <Layout className="app-content-layout">

        
        {/* 内容区域 */}
        <Content
          className="app-content"
          style={{
            background: colorBgContainer,
          }}
        >
          <Routes>
            <Route path="/" element={<LazyDatabaseManagement />} />
            <Route path="/query" element={<LazyQueryCenter />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
          </Layout>
        </AntdApp>
      </NetworkWrapper>
    </ErrorBoundary>
  )
}

export default App