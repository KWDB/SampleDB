import React, { useState } from 'react'
import {
  Row, Col, Card, Button, Select, Table, Typography, Space, 
  Input, Tabs, Tag, Modal, Form, InputNumber, App, Avatar, Tooltip
} from 'antd'
import {
  PlayCircleOutlined,
  HistoryOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { api } from '../services/api'
import dayjs from 'dayjs'
import { QueryCenterSkeleton, TableSkeleton } from '../components/SkeletonLoader'
import { SmartLoading } from '../components/LoadingState'
import { DataLoadError } from '../utils/errorHandlers.jsx'
import { OfflineDataNotice } from '../components/OfflineSupport'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const QueryCenter = () => {
  const { message } = App.useApp()
  const [selectedScenario, setSelectedScenario] = useState('')
  const [customSql, setCustomSql] = useState('')
  const [customDatabase, setCustomDatabase] = useState('mixed')
  const [activeTab, setActiveTab] = useState('scenarios')
  const [parameterModalVisible, setParameterModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [recentlyClickedScenario, setRecentlyClickedScenario] = useState(null)
  const [editorTheme, setEditorTheme] = useState('light')
  
  const queryClient = useQueryClient()

  // 根据数据库类型获取示例SQL
  const getSqlExamples = (database) => {
    const examples = {
      rdb: [
        { value: "SELECT * FROM rdb.meter_info LIMIT 10;", label: "查看电表信息" },
        { value: "SELECT * FROM rdb.user_info LIMIT 10;", label: "查看用户信息" },
        { value: "SELECT * FROM rdb.area_info LIMIT 10;", label: "查看区域信息" },
        { value: "SELECT \n  mi.meter_id,\n  u.user_name,\n  u.contact,\n  a.area_name\nFROM rdb.meter_info mi\nJOIN rdb.user_info u ON mi.user_id = u.user_id\nJOIN rdb.area_info a ON mi.area_id = a.area_id\nWHERE mi.status = 'Fault';", label: "故障电表查询" }
      ],
      tsdb: [
        { value: "SELECT * FROM tsdb.meter_data ORDER BY ts DESC LIMIT 10;", label: "查看最新电表数据" },
        { value: "SELECT \n  md.meter_id,\n  md.ts,\n  md.voltage,\n  md.current,\n  md.power\nFROM tsdb.meter_data md\nWHERE md.meter_id = 'M1'\n  AND md.ts > NOW() - INTERVAL '24 hours'\nORDER BY md.ts;", label: "电表24小时趋势" },
        { value: "SELECT \n  meter_id,\n  AVG(power) as avg_power,\n  MAX(power) as max_power,\n  MIN(power) as min_power\nFROM tsdb.meter_data\nWHERE ts > NOW() - INTERVAL '1 hour'\nGROUP BY meter_id;", label: "电表功率统计" }
      ],
      mixed: [
        { value: "SELECT \n  a.area_name,\n  SUM(md.energy) AS total_energy\nFROM tsdb.meter_data md\nJOIN rdb.meter_info mi ON md.meter_id = mi.meter_id\nJOIN rdb.area_info a ON mi.area_id = a.area_id\nGROUP BY a.area_name\nORDER BY total_energy DESC\nLIMIT 10;", label: "区域用电量TOP10" },
        { value: "SELECT \n  mi.meter_id,\n  u.user_name,\n  u.contact,\n  a.area_name\nFROM rdb.meter_info mi\nJOIN rdb.user_info u ON mi.user_id = u.user_id\nJOIN rdb.area_info a ON mi.area_id = a.area_id\nWHERE mi.status = 'Fault';", label: "故障电表查询" },
        { value: "SELECT \n  a.region,\n  COUNT(*) as meter_count,\n  AVG(md.power) as avg_power\nFROM tsdb.meter_data md\nJOIN rdb.meter_info mi ON md.meter_id = mi.meter_id\nJOIN rdb.area_info a ON mi.area_id = a.area_id\nGROUP BY a.region;", label: "按区域统计电表" },
        { value: "SELECT \n  md.meter_id,\n  md.ts,\n  ar.rule_name,\n  md.voltage,\n  md.current,\n  md.power\nFROM tsdb.meter_data md\nJOIN rdb.alarm_rules ar ON 1=1\nWHERE (ar.metric = 'voltage' \n       AND ((ar.operator = '>' AND md.voltage < ar.threshold) \n            OR (ar.operator = '<' AND md.voltage > ar.threshold)))\n   OR (ar.metric = 'current' AND md.current > ar.threshold)\n   OR (ar.metric = 'power' AND md.power > ar.threshold)\nORDER BY md.ts DESC\nLIMIT 100;", label: "告警检测查询" }
      ],
      defaultdb: [
        { value: "SHOW DATABASES;", label: "显示所有数据库" },
        { value: "SHOW TABLES;", label: "显示所有表" },
        { value: "SELECT version();", label: "查看数据库版本" }
      ]
    }
    return examples[database] || []
  }

  // 获取查询场景列表
  const { data: scenarios, isLoading: scenariosLoading } = useQuery({
    queryKey: ['query-scenarios'],
    queryFn: api.query.getScenarios,
  })

  // 对场景列表进行排序，将最近点击的场景置顶
  const sortedScenarios = React.useMemo(() => {
    if (!scenarios?.data || !recentlyClickedScenario) {
      return scenarios?.data || []
    }
    
    const scenarioList = [...scenarios.data]
    const recentIndex = scenarioList.findIndex(s => s.key === recentlyClickedScenario)
    
    if (recentIndex > 0) {
      // 将最近点击的场景移到第一位
      const recentScenario = scenarioList.splice(recentIndex, 1)[0]
      scenarioList.unshift(recentScenario)
    }
    
    return scenarioList
  }, [scenarios?.data, recentlyClickedScenario])

  // 获取查询历史
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['query-history'],
    queryFn: api.query.getHistory,
    refetchInterval: 30000,
  })

  // 获取电表列表（用于参数选择）
  const { data: meters } = useQuery({
    queryKey: ['meters'],
    queryFn: api.query.getMeters,
  })

  // 执行查询场景
  const executeScenarioMutation = useMutation({
    mutationFn: ({ scenarioKey, parameters }) => 
      api.query.executeScenario(scenarioKey, parameters),
    onSuccess: () => {
      queryClient.invalidateQueries(['query-history'])
      message.success('查询执行成功')
    },
    onError: (error) => {
      message.error(`查询执行失败: ${error.message}`)
    },
  })

  // 执行自定义SQL
  const executeCustomMutation = useMutation({
    mutationFn: ({ sql, database }) => 
      api.query.executeCustom(sql, database),
    onSuccess: () => {
      queryClient.invalidateQueries(['query-history'])
      message.success('SQL执行成功')
    },
    onError: (error) => {
      message.error(`SQL执行失败: ${error.message}`)
    },
  })

  // 处理场景查询执行
  const handleScenarioExecute = (scenario) => {
    // 记录最近点击的场景，用于置顶显示
    setRecentlyClickedScenario(scenario.key)
    
    // 重置自定义SQL的mutation状态
    executeCustomMutation.reset()
    
    if (scenario.parameters && scenario.parameters.length > 0) {
      // 需要参数，显示参数输入模态框
      setSelectedScenario(scenario)
      setParameterModalVisible(true)
      form.resetFields()
    } else {
      // 直接执行
      executeScenarioMutation.mutate({
        scenarioKey: scenario.key,
        parameters: {}
      })
    }
  }

  // 处理参数提交
  const handleParameterSubmit = async () => {
    try {
      const values = await form.validateFields()
      executeScenarioMutation.mutate({
        scenarioKey: selectedScenario.key,
        parameters: values
      })
      setParameterModalVisible(false)
    } catch (error) {
      console.error('参数验证失败:', error)
    }
  }

  // 处理自定义SQL执行
  const handleCustomExecute = () => {
    if (!customSql.trim()) {
      message.warning('请输入SQL语句')
      return
    }
    
    // 重置场景查询的mutation状态
    executeScenarioMutation.reset()
    
    executeCustomMutation.mutate({
      sql: customSql,
      database: customDatabase
    })
  }

  // 复制SQL到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    })
  }

  // 导出查询结果
  const exportResults = (data, filename) => {
    const csv = convertToCSV(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    link.click()
  }

  // 转换为CSV格式
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('\n')
    
    return csvContent
  }

  // 查询结果表格列配置
  const getResultColumns = (data) => {
    if (!data || data.length === 0) return []
    
    return Object.keys(data[0]).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value) => {
        if (value === null || value === undefined) return '-'
        if (typeof value === 'object') return JSON.stringify(value)
        if (typeof value === 'number') return value.toLocaleString()
        
        const stringValue = String(value)
        // 检查是否包含换行符
        if (stringValue.includes('\n')) {
          return (
            <div className="text-with-newlines">
              {stringValue}
            </div>
          )
        }
        
        return stringValue
      }
    }))
  }

  const isLoading = executeScenarioMutation.isPending || executeCustomMutation.isPending
  const queryResult = executeScenarioMutation.data || executeCustomMutation.data
  const isPageLoading = scenariosLoading && historyLoading
  const hasError = executeScenarioMutation.error || executeCustomMutation.error

  // 如果页面正在加载，显示骨架屏
  if (isPageLoading) {
    return <QueryCenterSkeleton />
  }

  return (
    <div className="query-center-container">
      <OfflineDataNotice />
      
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, textAlign: 'center' }}>示例SQL查询</Title>
        
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            loading={isLoading}
            onClick={() => {
              queryClient.invalidateQueries(['query-scenarios'])
              queryClient.invalidateQueries(['query-history'])
            }}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：查询配置 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                  <CodeOutlined />
                </Avatar>
                <span>查询配置</span>
              </Space>
            }
            className="query-config-card" 
            style={{ marginBottom: 24 }}
          >
            <Tabs 
              activeKey={activeTab} 
              onChange={(key) => {
                // 设置新的活动Tab
                setActiveTab(key)
                
                // 强制重置所有查询状态，确保组件完全重新渲染
                executeScenarioMutation.reset()
                executeCustomMutation.reset()
                
                // 根据切换的Tab类型进行特定的状态清理
                if (key === 'custom') {
                  // 切换到自定义SQL时的状态重置
                  setRecentlyClickedScenario(null) // 清除场景选择状态
                  setSelectedScenario('') // 重置选中的场景
                  setParameterModalVisible(false) // 关闭参数模态框
                  form.resetFields() // 重置表单字段
                } else if (key === 'scenarios') {
                  // 切换到查询场景时的状态重置
                  // 保持当前的自定义SQL内容，但清除执行状态
                  setParameterModalVisible(false) // 关闭参数模态框
                  form.resetFields() // 重置表单字段
                } else if (key === 'history') {
                  // 切换到查询历史时的状态重置
                  setRecentlyClickedScenario(null)
                  setSelectedScenario('')
                  setParameterModalVisible(false)
                  form.resetFields()
                  // 刷新查询历史数据
                  queryClient.invalidateQueries(['query-history'])
                }
                
                // 强制触发组件重新渲染
                // 通过更新一个临时状态来确保所有子组件都重新渲染
                setTimeout(() => {
                  // 延迟执行以确保状态更新完成后再触发重新渲染
                  queryClient.invalidateQueries(['query-scenarios'])
                }, 0)
              }}
              items={[
                {
                  key: 'scenarios',
                  label: '查询场景',
                  children: scenariosLoading ? (
                    <TableSkeleton rows={3} />
                  ) : scenarios?.error ? (
                    <DataLoadError 
                      error={scenarios.error}
                      onRetry={() => queryClient.invalidateQueries(['query-scenarios'])}
                    />
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {sortedScenarios?.map(scenario => {
                        const isRecentlyClicked = scenario.key === recentlyClickedScenario
                        return (
                          <Card 
                            key={scenario.key}
                            size="small"
                            className="scenario-card"
                            hoverable
                            style={{
                              border: isRecentlyClicked ? '2px solid #1890ff' : '1px solid #d9d9d9',
                              borderLeft: isRecentlyClicked ? '4px solid #1890ff' : '4px solid #52c41a',
                              boxShadow: isRecentlyClicked ? '0 4px 12px rgba(24, 144, 255, 0.15)' : undefined,
                              transition: 'all 0.3s ease',
                              marginBottom: 16
                            }}
                            actions={[
                              <Button 
                                key="execute"
                                type="primary" 
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleScenarioExecute(scenario)}
                                loading={isLoading}
                                style={{ fontWeight: 'bold' }}
                              >
                                执行查询
                              </Button>
                            ]}
                          >
                          <div>
                            <Text strong style={{ fontSize: '14px' }}>{scenario.name}</Text>
                            <Tag 
                              color={scenario.database === 'rdb' ? 'blue' : 
                                     scenario.database === 'tsdb' ? 'green' : 'orange'}
                              style={{ marginLeft: 8, fontSize: '11px' }}
                            >
                              {scenario.database.toUpperCase()}
                            </Tag>
                          </div>
                          <Paragraph 
                            type="secondary" 
                            className="scenario-description"
                            style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}
                          >
                            {scenario.description}
                          </Paragraph>
                          {scenario.parameters && scenario.parameters.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: '11px', color: '#666' }}>
                                需要参数: {scenario.parameters.join(', ')}
                              </Text>
                            </div>
                          )}
                        </Card>
                        )
                      })}
                    </Space>
                  )
                },
                {
                  key: 'custom',
                  label: '自定义SQL',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <Card 
                        size="small" 
                        style={{ 
                          borderLeft: '4px solid #fa8c16',
                          marginBottom: 16
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: '14px' }}>数据库选择:</Text>
                          <Select 
                            value={customDatabase} 
                            onChange={setCustomDatabase}
                            style={{ width: '100%', marginTop: 8 }}
                            size="middle"
                          >
                            <Option value="mixed">Mixed (跨库查询)</Option>
                            <Option value="rdb">RDB (关系数据表)</Option>
                            <Option value="tsdb">TSDB (时序数据表)</Option>
                            <Option value="defaultdb">DefaultDB</Option>
                          </Select>
                        </div>
                      </Card>
                      
                      <Card 
                        size="small" 
                        style={{ 
                          borderLeft: '4px solid #52c41a',
                          marginBottom: 16
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: '14px' }}>示例SQL:</Text>
                          <Select 
                            placeholder="选择示例SQL语句"
                            style={{ width: '100%', marginTop: 8 }}
                            size="middle"
                            onChange={(value) => {
                              // 将字面上的 \n 转换为实际的换行符
                              const formattedSql = value ? value.replace(/\\n/g, '\n') : '';
                              setCustomSql(formattedSql);
                            }}
                            allowClear
                            value={undefined} // 重置选择
                            key={customDatabase} // 当数据库改变时重新渲染
                          >
                            {getSqlExamples(customDatabase).map(example => (
                              <Option key={example.value} value={example.value}>
                                {example.label}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </Card>
                       
                      <Card 
                        size="small" 
                        style={{ 
                          borderLeft: '4px solid #722ed1',
                          marginBottom: 16
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '14px' }}>SQL语句:</Text>
                            <Select
                              value={editorTheme}
                              onChange={setEditorTheme}
                              size="small"
                              style={{ width: 100 }}
                            >
                              <Option value="light">浅色</Option>
                              <Option value="dark">深色</Option>
                            </Select>
                          </div>
                    <div style={{ 
                      border: editorTheme === 'dark' ? '1px solid #434343' : '1px solid #d9d9d9', 
                      borderRadius: '6px', 
                      overflow: 'hidden',
                      backgroundColor: editorTheme === 'dark' ? '#282c34' : '#ffffff'
                    }}>
                      <CodeMirror
                        value={customSql}
                        onChange={(value) => setCustomSql(value)}
                        extensions={[
                          sql(),
                          EditorView.lineWrapping,
                          EditorView.theme({
                            '&': {
                              fontSize: '14px'
                            },
                            '.cm-content': {
                              padding: '12px',
                              minHeight: '200px',
                              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
                              wordBreak: 'break-word'
                            },
                            '.cm-focused': {
                              outline: 'none'
                            },
                            '.cm-editor': {
                              borderRadius: '6px'
                            },
                            '.cm-line': {
                              wordWrap: 'break-word'
                            }
                          })
                        ]}
                        theme={editorTheme === 'dark' ? oneDark : 'light'}
                        placeholder={`请输入SQL查询语句或从上方选择示例...

支持的数据库:
- rdb: 关系数据表 (meter_info, user_info, area_info, alarm_rules)
- tsdb: 时序数据表 (meter_data)
- mixed: 跨库查询`}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          dropCursor: false,
                          allowMultipleSelections: false,
                          indentOnInput: true,
                          bracketMatching: true,
                          closeBrackets: true,
                          autocompletion: true,
                          highlightSelectionMatches: false,
                          searchKeymap: true,
                          tabSize: 2
                        }}
                      />
                    </div>
                        </div>
                      </Card>
                      
                      <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={handleCustomExecute}
                        loading={isLoading}
                        block
                        size="large"
                        style={{ 
                          fontWeight: 'bold',
                          height: '48px',
                          fontSize: '16px'
                        }}
                      >
                        执行查询
                      </Button>
                    </Space>
                  )
                },
                {key: 'history',
                  label: '查询历史',
                  children: historyLoading ? (
                    <TableSkeleton rows={5} />
                  ) : history?.error ? (
                    <DataLoadError 
                      error={history.error}
                      onRetry={() => queryClient.invalidateQueries(['query-history'])}
                    />
                  ) : history?.data && history.data.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {history.data.slice(-10).reverse().map(item => (
                        <Card 
                          key={item.id}
                          size="small"
                          className="history-card"
                          style={{ 
                            marginTop: 24,
                            borderRadius: '8px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            cursor: 'pointer'
                          }}
                          hoverable
                          onClick={() => {
                            setCustomSql(item.sql);
                            setCustomDatabase(item.database);
                            setActiveTab('custom');
                          }}
                        >
                          <div className="flex-between">
                            <div>
                              <Text strong style={{ fontSize: '14px' }}>
                                {item.type === 'scenario' ? item.scenarioName : '自定义查询'}
                              </Text>
                              <Tag 
                                color={item.database === 'rdb' ? 'blue' : 
                                       item.database === 'tsdb' ? 'green' : 'orange'}
                                style={{ 
                                  marginLeft: 8,
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  borderRadius: '4px'
                                }}
                              >
                                {item.database?.toUpperCase()}
                              </Tag>
                            </div>
                            <Tooltip title="复制SQL">
                              <Button 
                                type="text" 
                                icon={<CopyOutlined />}
                                style={{ color: '#1890ff' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(item.sql);
                                }}
                              />
                            </Tooltip>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11, color: '#666' }}>
                              <ClockCircleOutlined /> {dayjs(item.timestamp).format('MM-DD HH:mm:ss')}
                              <DatabaseOutlined style={{ marginLeft: 8 }} /> <span style={{ fontWeight: 'bold', color: '#52c41a' }}>{item.rowCount}</span> 行
                              <span style={{ marginLeft: 8 }}>⚡ <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>{item.executionTime}ms</span></span>
                            </Text>
                          </div>
                          <Text 
                            style={{ 
                              fontSize: '12px', 
                              color: '#666',
                              display: 'block',
                              marginTop: 8,
                              wordBreak: 'break-all',
                              lineHeight: '1.4'
                            }}
                          >
                            {item.sql.length > 100 ? `${item.sql.substring(0, 100)}...` : item.sql}
                          </Text>
                        </Card>
                      ))}
                    </Space>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                      <HistoryOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                      <div>暂无查询历史</div>
                      <div style={{ fontSize: 12, marginTop: 8 }}>执行查询后将在此显示历史记录</div>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* 右侧：查询结果 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DatabaseOutlined style={{ marginRight: 8, color: '#1890ff' }} /> 
                <span>查询结果</span>
              </div>
            }
            extra={
              queryResult && (
                <Space>
                  <Tooltip title="复制SQL">
                    <Button 
                      type="text"
                      icon={<CopyOutlined />}
                      style={{ color: '#1890ff' }}
                      onClick={() => copyToClipboard(queryResult.meta?.sql || '')}
                    />
                  </Tooltip>
                  <Tooltip title="导出CSV">
                    <Button 
                      type="text"
                      icon={<DownloadOutlined />}
                      style={{ color: '#52c41a' }}
                      onClick={() => exportResults(queryResult.data, 'query_result')}
                    />
                  </Tooltip>
                </Space>
              )
            }
            className="query-result-card"
            style={{ 
              marginBottom: 24
            }}
            hoverable
          >
            {isLoading ? (
              <div className="loading-container">
                <SmartLoading type="data" message="正在执行查询..." />
              </div>
            ) : hasError ? (
              <DataLoadError 
                error={hasError}
                onRetry={() => {
                  if (executeScenarioMutation.error) {
                    executeScenarioMutation.reset()
                  }
                  if (executeCustomMutation.error) {
                    executeCustomMutation.reset()
                  }
                }}
              />
            ) : queryResult ? (
              <div>
                {/* 查询元信息 */}
                <Card 
                  size="small" 
                  style={{ 
                    marginBottom: 16, 
                    backgroundColor: '#f8f9fa',
                    borderLeft: '4px solid #52c41a',
                    borderRadius: '8px'
                  }}
                >
                  <Space wrap>
                    <Text strong style={{ fontSize: '14px' }}>查询成功</Text>
                    <Tag 
                      color="blue"
                      style={{ 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }}
                    >
                      {queryResult.meta?.rowCount?.toLocaleString() || 0} 行
                    </Tag>
                    <Tag 
                      color="green"
                      style={{ 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }}
                    >
                      {queryResult.meta?.executionTime || 0}ms
                    </Tag>
                    <Tag 
                      color={queryResult.meta?.database === 'rdb' ? 'blue' : 
                             queryResult.meta?.database === 'tsdb' ? 'green' : 'orange'}
                      style={{ 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }}
                    >
                      {queryResult.meta?.database?.toUpperCase()}
                    </Tag>
                  </Space>
                </Card>

                {/* SQL语句显示 */}
                {queryResult.meta?.sql && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>执行的SQL:</Text>
                    <SyntaxHighlighter 
                      language="sql" 
                      style={tomorrow}
                      customStyle={{ 
                        fontSize: 12, 
                        margin: '8px 0',
                        borderRadius: 4
                      }}
                    >
                      {queryResult.meta.sql}
                    </SyntaxHighlighter>
                  </div>
                )}

                {/* 查询结果表格 */}
                {queryResult.data && queryResult.data.length > 0 ? (
                  <Table
                    dataSource={queryResult.data}
                    columns={getResultColumns(queryResult.data)}
                    rowKey={(record) => `row-${record.id || record.meter_id || record.timestamp || Object.values(record).slice(0, 3).join('-')}`}
                    scroll={{ x: 'max-content', y: 400 }}
                    pagination={{
                      total: queryResult?.data?.length || 0,
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      size: 'default',
                      style: { marginTop: 16 }
                    }}
                    size="middle"
                    bordered
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    <DatabaseOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>查询结果为空</div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>请检查查询条件或数据是否存在</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-container">
                <CodeOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p style={{ color: '#999', fontSize: '16px', fontWeight: '500' }}>请选择查询场景或输入自定义SQL语句</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 参数输入模态框 */}
      <Modal
        title={`${selectedScenario?.name} - 参数设置`}
        open={parameterModalVisible}
        onOk={handleParameterSubmit}
        onCancel={() => setParameterModalVisible(false)}
        confirmLoading={isLoading}
      >
        <Form form={form} layout="vertical">
          {selectedScenario?.parameters?.map(param => (
            <Form.Item
              key={param}
              name={param}
              label={param}
              rules={[{ required: true, message: `请输入${param}` }]}
            >
              {param === 'meter_id' ? (
                <Select 
                  placeholder="选择电表ID"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {meters?.data?.map(meter => (
                    <Option key={meter.meter_id} value={meter.meter_id}>
                      {meter.meter_id} - {meter.user_name} ({meter.area_name})
                    </Option>
                  ))}
                </Select>
              ) : param.includes('hours') || param.includes('limit') ? (
                <InputNumber min={1} placeholder={`请输入${param}`} />
              ) : (
                <Input placeholder={`请输入${param}`} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  )
}

export default QueryCenter