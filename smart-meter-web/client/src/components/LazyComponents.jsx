import { withLazyLoading } from '../utils/withLazyLoading.jsx'
import { LoadingSpinner, LazyErrorBoundary } from './LazyLoadingComponents'



// 预定义的懒加载组件
export const LazyQueryCenter = withLazyLoading(
  () => import('../pages/QueryCenter'),
  'QueryCenter',
  { tip: '加载查询中心...' }
)

export const LazyDatabaseManagement = withLazyLoading(
  () => import('../pages/DatabaseManagement'),
  'DatabaseManagement',
  { tip: '加载数据库管理...' }
)



export default {
  LoadingSpinner,
  LazyErrorBoundary,
  withLazyLoading,
  LazyQueryCenter,
  LazyDatabaseManagement
}