// 性能监控工具

// 性能指标收集器
class PerformanceMonitor {
  constructor() {
    this.metrics = []
    this.observers = []
    this.isEnabled = true
    this.maxMetrics = 1000 // 最大保存指标数量
    
    this.init()
  }

  init() {
    if (typeof window === 'undefined') return
    
    // 监听页面加载性能
    this.observePageLoad()
    
    // 监听长任务
    this.observeLongTasks()
    
    // 监听资源加载
    this.observeResources()
    
    // 监听用户交互
    this.observeUserInteractions()
    
    // 监听内存使用
    this.observeMemoryUsage()
    
    // 定期清理旧指标
    this.startCleanupTimer()
  }

  // 监听页面加载性能
  observePageLoad() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric({
              type: 'page_load',
              timestamp: Date.now(),
              data: {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint(),
                largestContentfulPaint: this.getLargestContentfulPaint(),
                cumulativeLayoutShift: this.getCumulativeLayoutShift(),
                firstInputDelay: this.getFirstInputDelay()
              }
            })
          }
        }
      })
      
      observer.observe({ entryTypes: ['navigation'] })
      this.observers.push(observer)
    }
  }

  // 监听长任务
  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            type: 'long_task',
            timestamp: Date.now(),
            data: {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            }
          })
        }
      })
      
      try {
        observer.observe({ entryTypes: ['longtask'] })
        this.observers.push(observer)
      } catch (e) {
        // longtask 可能不被支持
        console.warn('Long task monitoring not supported')
      }
    }
  }

  // 监听资源加载
  observeResources() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) { // 只记录加载时间超过1秒的资源
            this.recordMetric({
              type: 'slow_resource',
              timestamp: Date.now(),
              data: {
                name: entry.name,
                duration: entry.duration,
                size: entry.transferSize,
                type: entry.initiatorType
              }
            })
          }
        }
      })
      
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    }
  }

  // 监听用户交互
  observeUserInteractions() {
    const interactionTypes = ['click', 'keydown', 'scroll']
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const startTime = performance.now()
        
        // 使用 requestIdleCallback 或 setTimeout 来测量交互响应时间
        const measureResponse = () => {
          const endTime = performance.now()
          const duration = endTime - startTime
          
          if (duration > 100) { // 只记录响应时间超过100ms的交互
            this.recordMetric({
              type: 'slow_interaction',
              timestamp: Date.now(),
              data: {
                type,
                duration,
                target: event.target?.tagName || 'unknown'
              }
            })
          }
        }
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(measureResponse)
        } else {
          setTimeout(measureResponse, 0)
        }
      }, { passive: true })
    })
  }

  // 监听内存使用
  observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory
        this.recordMetric({
          type: 'memory_usage',
          timestamp: Date.now(),
          data: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          }
        })
      }, 30000) // 每30秒记录一次
    }
  }

  // 获取首次绘制时间
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint ? firstPaint.startTime : null
  }

  // 获取首次内容绘制时间
  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime : null
  }

  // 获取最大内容绘制时间
  getLargestContentfulPaint() {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry ? lastEntry.startTime : null)
          observer.disconnect()
        })
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
        
        // 5秒后超时
        setTimeout(() => {
          observer.disconnect()
          resolve(null)
        }, 5000)
      } else {
        resolve(null)
      }
    })
  }

  // 获取累积布局偏移
  getCumulativeLayoutShift() {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        let clsValue = 0
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
        })
        
        observer.observe({ entryTypes: ['layout-shift'] })
        
        // 5秒后返回结果
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 5000)
      } else {
        resolve(null)
      }
    })
  }

  // 获取首次输入延迟
  getFirstInputDelay() {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            resolve(entry.processingStart - entry.startTime)
            observer.disconnect()
            return
          }
        })
        
        observer.observe({ entryTypes: ['first-input'] })
        
        // 10秒后超时
        setTimeout(() => {
          observer.disconnect()
          resolve(null)
        }, 10000)
      } else {
        resolve(null)
      }
    })
  }

  // 记录API请求性能
  recordApiCall(url, method, startTime, endTime, success, error = null) {
    this.recordMetric({
      type: 'api_call',
      timestamp: Date.now(),
      data: {
        url,
        method,
        duration: endTime - startTime,
        success,
        error: error?.message || null,
        status: error?.response?.status || (success ? 200 : 0)
      }
    })
  }

  // 记录组件渲染性能
  recordComponentRender(componentName, renderTime) {
    this.recordMetric({
      type: 'component_render',
      timestamp: Date.now(),
      data: {
        componentName,
        renderTime
      }
    })
  }

  // 记录错误
  recordError(error, context = {}) {
    this.recordMetric({
      type: 'error',
      timestamp: Date.now(),
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context
      }
    })
  }

  // 记录指标
  recordMetric(metric) {
    if (!this.isEnabled) return
    
    this.metrics.push(metric)
    
    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
    
    // 触发实时监控
    this.checkThresholds(metric)
  }

  // 检查性能阈值
  checkThresholds(metric) {
    const thresholds = {
      api_call: 5000, // API调用超过5秒
      component_render: 100, // 组件渲染超过100ms
      long_task: 50, // 长任务超过50ms
      slow_interaction: 200, // 交互响应超过200ms
      memory_usage: 80 // 内存使用超过80%
    }
    
    const threshold = thresholds[metric.type]
    if (!threshold) return
    
    let value
    switch (metric.type) {
      case 'api_call':
      case 'component_render':
      case 'long_task':
      case 'slow_interaction':
        value = metric.data.duration
        break
      case 'memory_usage':
        value = metric.data.usagePercentage
        break
      default:
        return
    }
    
    if (value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.type}:`, {
        value,
        threshold,
        metric
      })
      
      // 可以在这里添加告警逻辑
      this.triggerAlert(metric, value, threshold)
    }
  }

  // 触发性能告警
  triggerAlert(metric, value, threshold) {
    // 这里可以集成告警系统
    const alertData = {
      type: 'performance_alert',
      metric: metric.type,
      value,
      threshold,
      timestamp: metric.timestamp,
      severity: value > threshold * 2 ? 'high' : 'medium'
    }
    
    // 发送到监控服务或显示用户通知
    console.warn('Performance Alert:', alertData)
  }

  // 获取性能报告
  getPerformanceReport(timeRange = 3600000) { // 默认1小时
    const now = Date.now()
    const startTime = now - timeRange
    
    const recentMetrics = this.metrics.filter(metric => 
      metric.timestamp >= startTime
    )
    
    const report = {
      timeRange: {
        start: startTime,
        end: now,
        duration: timeRange
      },
      summary: this.generateSummary(recentMetrics),
      details: this.groupMetricsByType(recentMetrics),
      recommendations: this.generateRecommendations(recentMetrics)
    }
    
    return report
  }

  // 生成性能摘要
  generateSummary(metrics) {
    const summary = {
      totalMetrics: metrics.length,
      errorCount: 0,
      avgApiResponseTime: 0,
      slowInteractions: 0,
      memoryPeakUsage: 0
    }
    
    const apiCalls = metrics.filter(m => m.type === 'api_call')
    const errors = metrics.filter(m => m.type === 'error')
    const interactions = metrics.filter(m => m.type === 'slow_interaction')
    const memoryMetrics = metrics.filter(m => m.type === 'memory_usage')
    
    summary.errorCount = errors.length
    summary.slowInteractions = interactions.length
    
    if (apiCalls.length > 0) {
      summary.avgApiResponseTime = apiCalls.reduce((sum, m) => 
        sum + m.data.duration, 0
      ) / apiCalls.length
    }
    
    if (memoryMetrics.length > 0) {
      summary.memoryPeakUsage = Math.max(...memoryMetrics.map(m => 
        m.data.usagePercentage
      ))
    }
    
    return summary
  }

  // 按类型分组指标
  groupMetricsByType(metrics) {
    const grouped = {}
    
    metrics.forEach(metric => {
      if (!grouped[metric.type]) {
        grouped[metric.type] = []
      }
      grouped[metric.type].push(metric)
    })
    
    return grouped
  }

  // 生成性能建议
  generateRecommendations(metrics) {
    const recommendations = []
    
    const apiCalls = metrics.filter(m => m.type === 'api_call')
    const slowApis = apiCalls.filter(m => m.data.duration > 3000)
    
    if (slowApis.length > 0) {
      recommendations.push({
        type: 'api_optimization',
        priority: 'high',
        message: `发现 ${slowApis.length} 个慢API调用，建议优化或添加缓存`,
        details: slowApis.map(m => m.data.url)
      })
    }
    
    const longTasks = metrics.filter(m => m.type === 'long_task')
    if (longTasks.length > 10) {
      recommendations.push({
        type: 'task_optimization',
        priority: 'medium',
        message: '检测到多个长任务，建议使用代码分割或Web Workers',
        details: `${longTasks.length} 个长任务`
      })
    }
    
    const memoryMetrics = metrics.filter(m => m.type === 'memory_usage')
    const highMemoryUsage = memoryMetrics.filter(m => m.data.usagePercentage > 70)
    
    if (highMemoryUsage.length > 0) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        message: '内存使用率较高，建议检查内存泄漏',
        details: `峰值使用率: ${Math.max(...highMemoryUsage.map(m => m.data.usagePercentage)).toFixed(1)}%`
      })
    }
    
    return recommendations
  }

  // 开始清理定时器
  startCleanupTimer() {
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000
      this.metrics = this.metrics.filter(metric => 
        metric.timestamp > oneHourAgo
      )
    }, 300000) // 每5分钟清理一次
  }

  // 启用/禁用监控
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  // 清理所有观察者
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor()

// 导出性能监控工具
export { performanceMonitor }

import React from 'react'

// 导出便捷方法
export const recordApiCall = (url, method, startTime, endTime, success, error) => {
  performanceMonitor.recordApiCall(url, method, startTime, endTime, success, error)
}

export const recordComponentRender = (componentName, renderTime) => {
  performanceMonitor.recordComponentRender(componentName, renderTime)
}

export const recordError = (error, context) => {
  performanceMonitor.recordError(error, context)
}

export const getPerformanceReport = (timeRange) => {
  return performanceMonitor.getPerformanceReport(timeRange)
}

// React Hook for component performance monitoring
export const usePerformanceMonitor = (componentName) => {
  const startTime = React.useMemo(() => performance.now(), [])
  
  React.useEffect(() => {
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      recordComponentRender(componentName, renderTime)
    }
  }, [componentName, startTime])
}

// HOC for automatic component performance monitoring
export const withPerformanceMonitor = (WrappedComponent) => {
  const ComponentWithMonitoring = (props) => {
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Unknown'
    usePerformanceMonitor(componentName)
    
    return React.createElement(WrappedComponent, props)
  }
  
  ComponentWithMonitoring.displayName = `withPerformanceMonitor(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return ComponentWithMonitoring
}