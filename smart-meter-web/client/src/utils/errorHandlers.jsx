import React from 'react'
import { Result, Button, Typography } from 'antd'

const { Text } = Typography

// 简化的错误显示组件
const ErrorDisplay = ({ 
  error, 
  onRetry, 
  title = '加载失败', 
  description = '数据加载时出现错误，请稍后重试' 
}) => {
  return (
    <Result
      status="error"
      title={title}
      subTitle={description}
      extra={[
        onRetry && (
          <Button key="retry" type="primary" onClick={onRetry}>
            重试
          </Button>
        )
      ]}
    >
      {error && (
        <div style={{ textAlign: 'left', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            错误信息: {error.message}
          </Text>
        </div>
      )}
    </Result>
  )
}

// 网络错误组件
export const NetworkError = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="网络连接失败"
      description="请检查您的网络连接，然后重试"
      onRetry={onRetry}
    />
  )
}

// 数据加载错误组件
export const DataLoadError = ({ onRetry, message }) => {
  return (
    <ErrorDisplay
      title="数据加载失败"
      description={message || "无法加载数据，请稍后重试"}
      onRetry={onRetry}
    />
  )
}