import React from 'react'
import { Spin, Alert } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { recordError } from '../utils/performance'

// 自定义加载组件
export const LoadingSpinner = ({ size = 'large', tip = '加载中...' }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '200px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <Spin 
      size={size} 
      indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
    />
    <span style={{ color: '#666', fontSize: '14px' }}>{tip}</span>
  </div>
)

// 错误边界组件
export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    recordError(error, {
      type: 'lazy_component_error',
      componentName: this.props.componentName,
      errorInfo
    })
    
    console.error('懒加载组件错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          message="组件加载失败"
          description={`${this.props.componentName} 组件加载时发生错误，请刷新页面重试。`}
          type="error"
          showIcon
          action={
            <button 
              onClick={() => window.location.reload()}
              style={{
                border: 'none',
                background: '#ff4d4f',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>
          }
          style={{ margin: '20px' }}
        />
      )
    }

    return this.props.children
  }
}