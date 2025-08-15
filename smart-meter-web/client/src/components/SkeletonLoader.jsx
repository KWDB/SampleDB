import React from 'react'
import { Card, Skeleton, Row, Col } from 'antd'

// 图表骨架屏
export const ChartSkeleton = ({ height = 300 }) => {
  return (
    <Card>
      <Skeleton.Input active style={{ width: '200px', marginBottom: '16px' }} />
      <Skeleton.Node active style={{ width: '100%', height: `${height}px` }}>
        <div style={{ 
          width: '100%', 
          height: '100%', 
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'loading 1.5s infinite'
        }} />
      </Skeleton.Node>
    </Card>
  )
}

// 表格骨架屏
export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <Card>
      <Skeleton.Input active style={{ width: '300px', marginBottom: '16px' }} />
      <div>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} style={{ marginBottom: '12px' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Skeleton.Input active style={{ width: '100%' }} />
              </Col>
              <Col span={6}>
                <Skeleton.Input active style={{ width: '100%' }} />
              </Col>
              <Col span={6}>
                <Skeleton.Input active style={{ width: '100%' }} />
              </Col>
              <Col span={6}>
                <Skeleton.Input active style={{ width: '100%' }} />
              </Col>
            </Row>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 仪表盘骨架屏（内部组件）
const DashboardSkeleton = () => {
  return (
    <div>
      {/* 统计卡片骨架 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {Array.from({ length: 4 }, (_, index) => (
          <Col key={index} xs={24} sm={12} lg={6}>
            <Card>
              <Skeleton.Avatar active size="large" style={{ marginBottom: '12px' }} />
              <Skeleton.Input active style={{ width: '80%', marginBottom: '8px' }} />
              <Skeleton.Input active style={{ width: '60%' }} />
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* 图表骨架 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ChartSkeleton height={300} />
        </Col>
        <Col xs={24} lg={12}>
          <ChartSkeleton height={300} />
        </Col>
        <Col xs={24}>
          <ChartSkeleton height={400} />
        </Col>
      </Row>
    </div>
  )
}

// 可视化页面骨架屏（内部组件）
const VisualizationSkeleton = () => {
  return (
    <div>
      {/* 控制面板骨架 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={6}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={6}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={6}>
            <Skeleton.Button active style={{ width: '100%' }} />
          </Col>
        </Row>
      </Card>
      
      {/* 图表网格骨架 */}
      <Row gutter={[16, 16]}>
        {Array.from({ length: 6 }, (_, index) => (
          <Col key={index} xs={24} lg={12}>
            <ChartSkeleton height={350} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

// 查询中心骨架屏
export const QueryCenterSkeleton = () => {
  return (
    <div>
      {/* 查询表单骨架 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Skeleton.Input active style={{ width: '100%', marginBottom: '16px' }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={8}>
            <Skeleton.Input active style={{ width: '100%', marginBottom: '16px' }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={8}>
            <Skeleton.Button active style={{ width: '100%', marginTop: '24px' }} />
          </Col>
        </Row>
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
      return <Skeleton active {...props} />
  }
}

export default { ChartSkeleton, TableSkeleton, QueryCenterSkeleton }