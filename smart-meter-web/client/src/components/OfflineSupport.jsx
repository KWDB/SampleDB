import React, { useState, useEffect } from 'react'
import { Alert, Button, Space, Typography, Card, Divider } from 'antd'
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  ReloadOutlined,
  CloudSyncOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const { Text, Paragraph } = Typography



// 网络状态指示器
export const NetworkStatusIndicator = ({ 
  showWhenOnline = false,
  position = 'top'
}) => {
  const { isOnline, wasOffline } = useNetworkStatus()
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (isOnline && !showWhenOnline && !showReconnected) {
    return null
  }

  const alertStyle = {
    position: 'fixed',
    left: '16px',
    right: '16px',
    zIndex: 1000,
    ...(position === 'top' ? { top: '16px' } : { bottom: '16px' })
  }

  if (!isOnline) {
    return (
      <Alert
        message="网络连接已断开"
        description="您当前处于离线状态，部分功能可能无法使用"
        type="warning"
        icon={<DisconnectOutlined />}
        showIcon
        style={alertStyle}
        action={
          <Button 
            size="small" 
            type="text" 
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
          >
            重试
          </Button>
        }
      />
    )
  }

  if (showReconnected) {
    return (
      <Alert
        message="网络连接已恢复"
        description="正在同步最新数据..."
        type="success"
        icon={<WifiOutlined />}
        showIcon
        style={alertStyle}
        closable
        onClose={() => setShowReconnected(false)}
      />
    )
  }

  return null
}

// 离线页面组件
export const OfflinePage = ({ onRetry }) => {
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    if (isOnline && onRetry) {
      onRetry()
    }
  }, [isOnline, onRetry])

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <DisconnectOutlined style={{ fontSize: '64px', color: '#faad14' }} />
          
          <div>
            <Text strong style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>
              网络连接已断开
            </Text>
            <Text type="secondary">
              请检查您的网络连接，然后重试
            </Text>
          </div>

          <Divider />

          <div style={{ textAlign: 'left' }}>
            <Paragraph>
              <Text strong>可能的解决方案：</Text>
            </Paragraph>
            <ul style={{ paddingLeft: '20px' }}>
              <li>检查网络连接是否正常</li>
              <li>确认WiFi或移动数据已开启</li>
              <li>尝试刷新页面</li>
              <li>联系网络管理员</li>
            </ul>
          </div>

          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
            {onRetry && (
              <Button 
                icon={<CloudSyncOutlined />}
                onClick={onRetry}
              >
                重试连接
              </Button>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  )
}

// 数据同步状态组件
export const DataSyncStatus = ({ 
  isSyncing = false, 
  lastSyncTime = null,
  onSync
}) => {
  const { isOnline } = useNetworkStatus()
  
  const formatSyncTime = (time) => {
    if (!time) return '从未同步'
    const now = new Date()
    const syncTime = new Date(time)
    const diffMinutes = Math.floor((now - syncTime) / (1000 * 60))
    
    if (diffMinutes < 1) return '刚刚同步'
    if (diffMinutes < 60) return `${diffMinutes}分钟前同步`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前同步`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前同步`
  }

  if (!isOnline) {
    return (
      <Alert
        message="离线模式"
        description="当前处于离线状态，显示的是缓存数据"
        type="info"
        icon={<DisconnectOutlined />}
        showIcon
        style={{ marginBottom: '16px' }}
      />
    )
  }

  return (
    <div style={{ 
      padding: '8px 12px', 
      backgroundColor: '#f6ffed', 
      border: '1px solid #b7eb8f',
      borderRadius: '6px',
      marginBottom: '16px'
    }}>
      <Space>
        <WifiOutlined style={{ color: '#52c41a' }} />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {isSyncing ? '正在同步数据...' : `数据状态: ${formatSyncTime(lastSyncTime)}`}
        </Text>
        {onSync && !isSyncing && (
          <Button 
            type="link" 
            size="small" 
            icon={<CloudSyncOutlined />}
            onClick={onSync}
            style={{ padding: '0 4px', height: 'auto' }}
          >
            立即同步
          </Button>
        )}
      </Space>
    </div>
  )
}

// 离线数据提示组件
export const OfflineDataNotice = ({ 
  dataAge = null,
  onRefresh
}) => {
  const { isOnline } = useNetworkStatus()
  
  if (isOnline) return null
  
  const getDataAgeText = () => {
    if (!dataAge) return '未知时间'
    const now = new Date()
    const age = new Date(dataAge)
    const diffMinutes = Math.floor((now - age) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前`
  }

  return (
    <Alert
      message="离线数据提示"
      description={`当前显示的是${getDataAgeText()}的缓存数据，可能不是最新信息`}
      type="warning"
      icon={<ExclamationCircleOutlined />}
      showIcon
      style={{ marginBottom: '16px' }}
      action={
        onRefresh && (
          <Button size="small" onClick={onRefresh}>
            网络恢复后刷新
          </Button>
        )
      }
    />
  )
}

// 网络状态包装器组件
export const NetworkWrapper = ({ 
  children, 
  fallback = null,
  showOfflinePage = true
}) => {
  const { isOnline } = useNetworkStatus()
  
  if (!isOnline) {
    if (fallback) {
      return fallback
    }
    if (showOfflinePage) {
      return <OfflinePage />
    }
  }
  
  return (
    <>
      <NetworkStatusIndicator />
      {children}
    </>
  )
}

export default NetworkWrapper