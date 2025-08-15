import React from 'react'
import { Spin, Card, Space, Typography, Progress } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const { Text } = Typography

// 自定义加载图标
const customLoadingIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

// 基础加载组件（内部使用）
const BasicLoading = ({ 
  size = 'default', 
  tip = '加载中...', 
  spinning = true,
  children 
}) => {
  return (
    <Spin 
      size={size} 
      tip={tip} 
      spinning={spinning}
      indicator={customLoadingIcon}
    >
      {children}
    </Spin>
  )
}

// 全屏加载组件（内部使用）
const FullScreenLoading = ({ tip = '正在加载，请稍候...' }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 9999
    }}>
      <Space direction="vertical" align="center" size="large">
        <Spin size="large" indicator={customLoadingIcon} />
        <Text type="secondary">{tip}</Text>
      </Space>
    </div>
  )
}

// 卡片加载组件（内部使用）
const CardLoading = ({ 
  title, 
  height = 200, 
  tip = '加载中...'
}) => {
  return (
    <Card title={title}>
      <div style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Spin size="large" indicator={customLoadingIcon} />
        <Text type="secondary" style={{ marginTop: '16px' }}>
          {tip}
        </Text>
      </div>
    </Card>
  )
}

// 进度加载组件（内部使用）
const ProgressLoading = ({ 
  percent = 0, 
  status = 'active',
  title = '加载进度',
  description
}) => {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" indicator={customLoadingIcon} />
          <div style={{ marginTop: '16px' }}>
            <Text strong>{title}</Text>
            {description && (
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary">{description}</Text>
              </div>
            )}
          </div>
        </div>
        <Progress 
          percent={percent} 
          status={status}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </Space>
    </div>
  )
}

// 数据加载组件（内部使用）
const DataLoading = ({ 
  message = '正在获取数据...', 
  size = 'default'
}) => {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center'
    }}>
      <Space direction="vertical" size="middle">
        <Spin size={size} indicator={customLoadingIcon} />
        <Text type="secondary">{message}</Text>
      </Space>
    </div>
  )
}

// 图表加载组件（内部使用）
const ChartLoading = ({ height = 300 }) => {
  return (
    <div style={{
      height: `${height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fafafa',
      border: '1px dashed #d9d9d9',
      borderRadius: '6px'
    }}>
      <Space direction="vertical" align="center">
        <Spin size="large" indicator={customLoadingIcon} />
        <Text type="secondary">图表加载中...</Text>
      </Space>
    </div>
  )
}

// 表格加载组件（内部使用）
const TableLoading = ({ rows = 5 }) => {
  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ textAlign: 'center' }}>
          <Spin indicator={customLoadingIcon} />
          <Text type="secondary" style={{ marginLeft: '8px' }}>
            正在加载表格数据...
          </Text>
        </div>
        {/* 模拟表格行 */}
        {Array.from({ length: rows }, (_, index) => (
          <div 
            key={index}
            style={{
              height: '32px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              opacity: 0.6 - (index * 0.1)
            }}
          />
        ))}
      </Space>
    </div>
  )
}

// 页面加载组件（内部使用）
const PageLoading = ({ 
  tip = '页面加载中...', 
  description = '正在为您准备内容'
}) => {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Space direction="vertical" align="center" size="large">
        <Spin size="large" indicator={customLoadingIcon} />
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '16px' }}>{tip}</Text>
          <br />
          <Text type="secondary">{description}</Text>
        </div>
      </Space>
    </div>
  )
}

// 智能加载组件 - 根据类型自动选择合适的加载样式
export const SmartLoading = ({ 
  type = 'basic',
  loading = true,
  children,
  ...props 
}) => {
  if (!loading) {
    return children
  }

  switch (type) {
    case 'fullscreen':
      return <FullScreenLoading {...props} />
    case 'card':
      return <CardLoading {...props} />
    case 'progress':
      return <ProgressLoading {...props} />
    case 'data':
      return <DataLoading {...props} />
    case 'chart':
      return <ChartLoading {...props} />
    case 'table':
      return <TableLoading {...props} />
    case 'page':
      return <PageLoading {...props} />
    default:
      return (
        <BasicLoading {...props}>
          {children}
        </BasicLoading>
      )
  }
}

export default SmartLoading