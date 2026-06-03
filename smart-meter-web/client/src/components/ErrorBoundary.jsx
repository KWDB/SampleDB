import React from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button, Card, Paragraph, Space, Text } from './ui'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 可以在这里添加错误上报逻辑
    this.reportError(error, errorInfo)
  }

  reportError = (error, errorInfo) => {
    // 错误上报逻辑
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // 这里可以发送到错误监控服务
    console.log('Error Report:', errorReport)
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false } = this.props
      const { error, errorInfo, retryCount } = this.state

      // 如果提供了自定义fallback组件
      if (fallback) {
        return fallback(error, this.handleRetry)
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-panel">
            <AlertTriangle className="error-boundary-icon" aria-hidden="true" />
            <Text className="error-boundary-title">页面出现错误</Text>
            <Text className="error-boundary-copy">
              页面遇到了一些问题。你可以尝试刷新当前视图，或返回首页继续查看 KWDB 示例。
            </Text>
            <Space size="middle" wrap>
              <Button
                type="primary"
                icon={<RefreshCw />}
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3 ? '重试次数已达上限' : '重试'}
              </Button>
              <Button
                icon={<Home />}
                onClick={this.handleGoHome}
              >
                返回首页
              </Button>
            </Space>
          </div>

          {showDetails && error && (
            <Card
              title="错误详情"
              style={{ marginTop: '24px' }}
              size="small"
            >
              <Paragraph>
                <Text strong>错误信息：</Text>
                <br />
                <Text code>{error.message}</Text>
              </Paragraph>

              {errorInfo && (
                <Paragraph>
                  <Text strong>组件堆栈：</Text>
                  <br />
                  <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {errorInfo.componentStack}
                  </Text>
                </Paragraph>
              )}

              <Paragraph>
                <Text strong>错误堆栈：</Text>
                <br />
                <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {error.stack}
                </Text>
              </Paragraph>
            </Card>
          )}
        </div>
      )
    }

    return this.props.children
  }
}



export default ErrorBoundary
