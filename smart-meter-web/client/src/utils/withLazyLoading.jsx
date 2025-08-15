import React, { lazy, Suspense } from 'react'
import { recordError } from './performance'
import { LoadingSpinner, LazyErrorBoundary } from '../components/LazyLoadingComponents'

// 高阶组件：为懒加载组件添加错误边界和加载状态
export const withLazyLoading = (importFunc, componentName, loadingProps = {}) => {
  const LazyComponent = lazy(() => {
    const startTime = performance.now()
    
    return importFunc().then(module => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // 记录组件加载时间
      console.log(`懒加载组件 ${componentName} 加载耗时: ${loadTime.toFixed(2)}ms`)
      
      // 如果加载时间过长，记录性能问题
      if (loadTime > 2000) {
        recordError(new Error(`Slow component loading: ${componentName}`), {
          type: 'slow_lazy_loading',
          componentName,
          loadTime
        })
      }
      
      return module
    }).catch(error => {
      recordError(error, {
        type: 'lazy_loading_failed',
        componentName
      })
      throw error
    })
  })
  
  const WrappedComponent = (props) => (
    <LazyErrorBoundary componentName={componentName}>
      <Suspense fallback={<LoadingSpinner {...loadingProps} />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  )
  
  WrappedComponent.displayName = `LazyLoaded(${componentName})`
  
  return WrappedComponent
}