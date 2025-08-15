import { useState, useEffect, useCallback } from 'react'

// 智能预加载钩子
export const useSmartPreload = (routes = []) => {
  const [preloadedRoutes, setPreloadedRoutes] = useState(new Set())
  const [isPreloading, setIsPreloading] = useState(false)
  
  const preloadRoute = useCallback(async (routePath) => {
    if (preloadedRoutes.has(routePath) || isPreloading) {
      return
    }
    
    setIsPreloading(true)
    
    try {
      // 根据路由路径动态导入对应组件
      switch (routePath) {
        case '/query':
          await import('../pages/QueryCenter')
          break
        case '/database':
          await import('../pages/DatabaseManagement')
          break
        default:
          console.warn(`Unknown route for preloading: ${routePath}`)
      }
      
      setPreloadedRoutes(prev => new Set([...prev, routePath]))
    } catch (error) {
      console.error(`Failed to preload route ${routePath}:`, error)
    } finally {
      setIsPreloading(false)
    }
  }, [preloadedRoutes, isPreloading])
  
  const preloadAll = useCallback(async () => {
    if (routes.length === 0) return
    
    for (const route of routes) {
      await preloadRoute(route)
    }
  }, [routes, preloadRoute])
  
  // 在空闲时间预加载
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleCallback = window.requestIdleCallback(() => {
        preloadAll()
      })
      
      return () => {
        window.cancelIdleCallback(idleCallback)
      }
    } else {
      // 降级方案：使用 setTimeout
      const timeoutId = setTimeout(() => {
        preloadAll()
      }, 2000)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [preloadAll])
  
  return {
    preloadRoute,
    preloadAll,
    preloadedRoutes: Array.from(preloadedRoutes),
    isPreloading
  }
}