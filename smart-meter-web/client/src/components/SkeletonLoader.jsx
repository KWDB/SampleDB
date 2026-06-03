import React from 'react'
import { Card, SkeletonBlock } from './ui'

// 图表骨架屏
export const ChartSkeleton = ({ height = 300 }) => {
  return (
    <Card>
      <SkeletonBlock rows={1} />
      <div className="ui-skeleton-chart" style={{ height: `${height}px` }} />
    </Card>
  )
}

// 表格骨架屏
export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <Card>
      <SkeletonBlock rows={rows + 1} />
    </Card>
  )
}

// 仪表盘骨架屏（内部组件）
const DashboardSkeleton = () => {
  return (
    <div>
      {/* 统计卡片骨架 */}
      <div className="ui-skeleton-grid stats" style={{ marginBottom: '24px' }}>
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <SkeletonBlock rows={3} />
          </Card>
        ))}
      </div>
      
      {/* 图表骨架 */}
      <div className="ui-skeleton-grid">
        <ChartSkeleton height={300} />
        <ChartSkeleton height={300} />
        <ChartSkeleton height={400} />
      </div>
    </div>
  )
}

// 可视化页面骨架屏（内部组件）
const VisualizationSkeleton = () => {
  return (
    <div>
      {/* 控制面板骨架 */}
      <Card style={{ marginBottom: '24px' }}>
        <SkeletonBlock rows={2} />
      </Card>
      
      {/* 图表网格骨架 */}
      <div className="ui-skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <ChartSkeleton key={index} height={350} />
        ))}
      </div>
    </div>
  )
}

// 查询中心骨架屏
export const QueryCenterSkeleton = () => {
  return (
    <div>
      {/* 查询表单骨架 */}
      <Card style={{ marginBottom: '24px' }}>
        <SkeletonBlock rows={3} />
      </Card>
      
      {/* 结果表格骨架 */}
      <TableSkeleton rows={8} />
    </div>
  )
}

// 通用加载骨架屏（内部组件）
const _LoadingSkeleton = ({ type = 'default', ...props }) => {
  switch (type) {
    case 'chart':
      return <ChartSkeleton {...props} />
    case 'table':
      return <TableSkeleton {...props} />
    case 'dashboard':
      return <DashboardSkeleton {...props} />
    case 'visualization':
      return <VisualizationSkeleton {...props} />
    case 'query':
      return <QueryCenterSkeleton {...props} />
    default:
      return <SkeletonBlock {...props} />
  }
}

export default { ChartSkeleton, TableSkeleton, QueryCenterSkeleton }
