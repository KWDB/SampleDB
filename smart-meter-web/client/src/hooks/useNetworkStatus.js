import { useState, useEffect } from 'react'

// 网络状态监控Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState('unknown')
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now())
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastOnlineTime(Date.now())
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }
    
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        setConnectionType(navigator.connection.effectiveType || 'unknown')
      }
    }
    
    // 监听网络状态变化
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // 监听连接类型变化（如果支持）
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange)
      setConnectionType(navigator.connection.effectiveType || 'unknown')
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])
  
  return {
    isOnline,
    connectionType,
    lastOnlineTime
  }
}