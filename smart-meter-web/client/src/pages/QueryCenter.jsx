import React, { Suspense, useState } from 'react'
import {
  Button,
  Card,
  DialogModal,
  Form,
  Input,
  InputNumber,
  Option,
  Select,
  Table,
  Tabs,
  Tag,
  Text,
  Paragraph,
  Title,
  Tooltip,
  useMessage
} from '../components/ui'
import {
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  History,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import dayjs from 'dayjs'
import { QueryCenterSkeleton, TableSkeleton } from '../components/SkeletonLoader'
import { SmartLoading } from '../components/LoadingState'
import { DataLoadError } from '../utils/errorHandlers.jsx'
import { OfflineDataNotice } from '../components/OfflineSupport'

const LazySqlEditor = React.lazy(() => import('../components/LazySqlEditor'))
const LazySqlHighlighter = React.lazy(() => import('../components/LazySqlHighlighter'))
const LazyQueryResultChart = React.lazy(() => import('../components/QueryResultChart'))

const databaseLabels = {
  rdb: 'RDB',
  tsdb: 'TSDB',
  mixed: 'Mixed',
  defaultdb: 'DefaultDB'
}

const databaseNames = {
  rdb: '关系数据表',
  tsdb: '时序数据表',
  mixed: '跨库查询',
  defaultdb: '默认数据库'
}

const getDatabaseLabel = (database) => databaseLabels[database] || database?.toUpperCase() || 'Mixed'
const getDatabaseName = (database) => databaseNames[database] || '查询数据库'
const getDatabaseTagClass = (database) => `query-db-tag db-${database || 'mixed'}`
const sqlEditorPlaceholder = `请输入 SQL 查询语句，或从上方选择示例。

支持的数据库:
- rdb: 关系数据表, meter_info、user_info、area_info、alarm_rules
- tsdb: 时序数据表, meter_data
- mixed: 跨库查询`

const QueryCenter = () => {
  const message = useMessage()
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
        { value: "SELECT \n  meter_id,\n  AVG(power) as avg_power,\n  MAX(power) as max_power,\n  MIN(power) as min_power\nFROM tsdb.meter_data\nWHERE ts > NOW() - INTERVAL '1 hour'\nGROUP BY meter_id;", label: "电表功率统计" },
        { value: `SELECT
  meter_id,
  time_bucket(ts, '1h') AS bucket_start,
  COUNT(*) AS sample_count,
  AVG(power) AS avg_power,
  MAX(power) AS max_power
FROM tsdb.meter_data
WHERE meter_id IN ('M1', 'M2', 'M3')
GROUP BY meter_id, bucket_start
ORDER BY meter_id, bucket_start;`, label: "分时负荷统计" },
        { value: `SELECT
  meter_id,
  first(ts) AS session_start,
  last(ts) AS session_end,
  COUNT(*) AS sample_count,
  SUM(energy) AS total_energy
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, session_window(ts, '30m')
ORDER BY session_start;`, label: "用电会话分析" },
        { value: `SELECT
  meter_id,
  first(ts) AS window_start,
  last(ts) AS window_end,
  COUNT(*) AS sample_count,
  MIN(voltage) AS min_voltage,
  MAX(voltage) AS max_voltage
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY
  meter_id,
  state_window(CASE WHEN voltage >= 225 THEN 'high' ELSE 'low' END)
ORDER BY window_start;`, label: "电压状态持续分析" },
        { value: `SELECT
  meter_id,
  first(ts) AS event_start,
  last(ts) AS event_end,
  COUNT(*) AS sample_count,
  MAX(current) AS peak_current,
  AVG(power) AS avg_power
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, event_window(current >= 6, current <= 5.3)
ORDER BY event_start;`, label: "异常电流事件识别" },
        { value: `SELECT
  meter_id,
  first(ts) AS window_start,
  last(ts) AS window_end,
  COUNT(*) AS sample_count,
  AVG(power) AS avg_power,
  MAX(power) AS max_power
FROM tsdb.meter_data
WHERE meter_id = 'M1'
GROUP BY meter_id, count_window(12, 6)
ORDER BY window_start;`, label: "滑动采样趋势分析" }
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

  const handleTabChange = (key) => {
    setActiveTab(key)
    executeScenarioMutation.reset()
    executeCustomMutation.reset()

    if (key === 'custom') {
      setRecentlyClickedScenario(null)
      setSelectedScenario('')
      setParameterModalVisible(false)
      form.resetFields()
    } else if (key === 'scenarios') {
      setParameterModalVisible(false)
      form.resetFields()
    } else if (key === 'history') {
      setRecentlyClickedScenario(null)
      setSelectedScenario('')
      setParameterModalVisible(false)
      form.resetFields()
      queryClient.invalidateQueries(['query-history'])
    }

    setTimeout(() => {
      queryClient.invalidateQueries(['query-scenarios'])
    }, 0)
  }

  const renderQueryConfigCard = (variantClass = '') => (
    <Card className={`query-panel query-config-card${variantClass ? ` ${variantClass}` : ''}`}>
      <div className="query-panel-header">
        <div>
          <Text className="query-section-label">查询输入</Text>
          <Title level={2}>选择场景或编写 SQL</Title>
        </div>
        <Code2 className="query-panel-icon" />
      </div>

      <Tabs
        className="query-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'scenarios',
            label: '场景',
            children: scenariosLoading ? (
              <TableSkeleton rows={3} />
            ) : scenarios?.error ? (
              <DataLoadError
                error={scenarios.error}
                onRetry={() => queryClient.invalidateQueries(['query-scenarios'])}
              />
            ) : sortedScenarios?.length > 0 ? (
              <div className="scenario-list">
                {sortedScenarios.map(scenario => {
                  const isRecentlyClicked = scenario.key === recentlyClickedScenario
                  return (
                    <article
                      key={scenario.key}
                      className={`scenario-item scenario-item--inset${isRecentlyClicked ? ' is-selected' : ''}`}
                    >
                      <div className="scenario-item-main">
                        <div className="scenario-title-row scenario-title-row-scan">
                          <Text className="scenario-title">{scenario.name}</Text>
                          <Tag className={getDatabaseTagClass(scenario.database)}>
                            {getDatabaseLabel(scenario.database)}
                          </Tag>
                        </div>
                        <Paragraph className="scenario-description">
                          {scenario.description}
                        </Paragraph>
                        {scenario.parameters && scenario.parameters.length > 0 && (
                          <Text className="scenario-params">
                            参数: {scenario.parameters.join(', ')}
                          </Text>
                        )}
                      </div>
                      <Button
                        className="scenario-run-button"
                        type="text"
                        icon={<PlayCircle />}
                        onClick={() => handleScenarioExecute(scenario)}
                        loading={isLoading}
                      >
                        运行
                      </Button>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="query-empty-state">
                <Database aria-hidden="true" />
                <Text className="query-empty-title">暂无查询场景</Text>
                <Text className="query-empty-copy">请确认后端服务已返回示例 SQL 配置。</Text>
              </div>
            )
          },
          {
            key: 'custom',
            label: '自定义 SQL',
            children: (
              <div className="custom-sql-panel">
                <div className="query-control-grid">
                  <label className="query-field">
                    <span>数据库</span>
                    <Select
                      value={customDatabase}
                      onChange={setCustomDatabase}
                      size="middle"
                    >
                      <Option value="mixed">Mixed, 跨库查询</Option>
                      <Option value="rdb">RDB, 关系数据表</Option>
                      <Option value="tsdb">TSDB, 时序数据表</Option>
                      <Option value="defaultdb">DefaultDB</Option>
                    </Select>
                  </label>

                  <label className="query-field">
                    <span>示例 SQL</span>
                    <Select
                      placeholder="选择后填入编辑器"
                      size="middle"
                      onChange={(value) => {
                        const formattedSql = value ? value.replace(/\\n/g, '\n') : ''
                        setCustomSql(formattedSql)
                      }}
                      allowClear
                      value={undefined}
                      key={customDatabase}
                    >
                      {getSqlExamples(customDatabase).map(example => (
                        <Option key={example.value} value={example.value}>
                          {example.label}
                        </Option>
                      ))}
                    </Select>
                  </label>
                </div>

                <div className="sql-editor-shell">
                  <div className="sql-editor-toolbar">
                    <div>
                      <Text className="sql-editor-title">SQL 语句</Text>
                      <Text className="sql-editor-context">{getDatabaseName(customDatabase)}</Text>
                    </div>
                    <Select
                      className="sql-theme-select"
                      value={editorTheme}
                      onChange={setEditorTheme}
                      size="small"
                    >
                      <Option value="light">浅色</Option>
                      <Option value="dark">深色</Option>
                    </Select>
                  </div>

                  <div className={`sql-editor-frame theme-${editorTheme}`}>
                    <Suspense fallback={<div className="sql-editor-loading">加载 SQL 编辑器...</div>}>
                      <LazySqlEditor
                        value={customSql}
                        onChange={(value) => setCustomSql(value)}
                        editorTheme={editorTheme}
                        placeholder={sqlEditorPlaceholder}
                      />
                    </Suspense>
                  </div>
                </div>

                <Button
                  className="custom-run-button"
                  type="primary"
                  icon={<PlayCircle />}
                  onClick={handleCustomExecute}
                  loading={isLoading}
                  block
                >
                  运行 SQL
                </Button>
              </div>
            )
          },
          {
            key: 'history',
            label: '历史',
            children: historyLoading ? (
              <TableSkeleton rows={5} />
            ) : history?.error ? (
              <DataLoadError
                error={history.error}
                onRetry={() => queryClient.invalidateQueries(['query-history'])}
              />
            ) : history?.data && history.data.length > 0 ? (
              <div className="query-history-list">
                {history.data.slice(-10).reverse().map(item => (
                  <article
                    key={item.id}
                    className="history-item"
                    tabIndex={0}
                    role="button"
                    onClick={() => {
                      setCustomSql(item.sql)
                      setCustomDatabase(item.database)
                      setActiveTab('custom')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setCustomSql(item.sql)
                        setCustomDatabase(item.database)
                        setActiveTab('custom')
                      }
                    }}
                  >
                    <div className="history-item-header">
                      <div>
                        <Text className="history-title">
                          {item.type === 'scenario' ? item.scenarioName : '自定义查询'}
                        </Text>
                        <Text className="history-meta">
                          <Clock3 /> {dayjs(item.timestamp).format('MM-DD HH:mm:ss')}
                          <span>{item.rowCount} 行</span>
                          <span>{item.executionTime}ms</span>
                        </Text>
                      </div>
                      <div className="history-actions">
                        <Tag className={getDatabaseTagClass(item.database)}>
                          {getDatabaseLabel(item.database)}
                        </Tag>
                        <Tooltip title="复制 SQL">
                          <Button
                            type="text"
                            icon={<Copy />}
                            aria-label="复制历史 SQL"
                            onClick={(event) => {
                              event.stopPropagation()
                              copyToClipboard(item.sql)
                            }}
                          />
                        </Tooltip>
                      </div>
                    </div>
                    <Text className="history-sql">
                      {item.sql.length > 120 ? `${item.sql.substring(0, 120)}...` : item.sql}
                    </Text>
                  </article>
                ))}
              </div>
            ) : (
              <div className="query-empty-state">
                <History aria-hidden="true" />
                <Text className="query-empty-title">暂无查询历史</Text>
                <Text className="query-empty-copy">运行场景或自定义 SQL 后，最近 10 条记录会显示在这里。</Text>
              </div>
            )
          }
        ]}
      />
    </Card>
  )

  const renderQueryResultCard = (variantClass = '') => (
    <Card className={`query-panel query-result-card${variantClass ? ` ${variantClass}` : ''}`}>
      <div className="query-panel-header result-header">
        <div>
          <Text className="query-section-label">查询输出</Text>
          <Title level={2}>结果与执行信息</Title>
        </div>
        {queryResult && (
          <div className="result-actions">
            <Tooltip title="复制 SQL">
              <Button
                type="text"
                icon={<Copy />}
                aria-label="复制本次执行的 SQL"
                onClick={() => copyToClipboard(queryResult.meta?.sql || '')}
              />
            </Tooltip>
            <Tooltip title="导出 CSV">
              <Button
                type="text"
                icon={<Download />}
                aria-label="导出查询结果 CSV"
                onClick={() => exportResults(queryResult.data, 'query_result')}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="query-loading-state">
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
        <div className="result-content">
          <div className="result-summary" aria-label="查询执行摘要">
            <div>
              <Text className="result-status">查询成功</Text>
              <Text className="result-status-copy">结果来自当前选中的 KWDB 示例数据库。</Text>
            </div>
            <div className="result-metrics">
              <span>{queryResult.meta?.rowCount?.toLocaleString() || 0} 行</span>
              <span>{queryResult.meta?.executionTime || 0}ms</span>
              <Tag className={getDatabaseTagClass(queryResult.meta?.database)}>
                {getDatabaseLabel(queryResult.meta?.database)}
              </Tag>
            </div>
          </div>

          {queryResult.meta?.sql && (
            <div className="executed-sql">
              <Text className="executed-sql-label">执行的 SQL</Text>
              <Suspense fallback={<pre className="executed-sql-fallback">{queryResult.meta.sql}</pre>}>
                <LazySqlHighlighter
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#f3f4f6'
                  }}
                >
                  {queryResult.meta.sql}
                </LazySqlHighlighter>
              </Suspense>
            </div>
          )}

          {queryResult.data && queryResult.data.length > 0 ? (
            <Tabs
              className="result-tabs"
              defaultActiveKey="table"
              items={[
                {
                  key: 'table',
                  label: '表格',
                  children: (
                    <Table
                      className="smart-table query-result-table"
                      dataSource={queryResult.data}
                      columns={getResultColumns(queryResult.data)}
                      rowKey={(record, index) => `row-${index}-${record.id || record.meter_id || record.timestamp || Object.values(record).slice(0, 3).join('-')}`}
                      scroll={{ x: 'max-content', y: 400 }}
                      pagination={{
                        total: queryResult?.data?.length || 0,
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        size: 'default'
                      }}
                      size="middle"
                    />
                  )
                },
                ...(queryResult.meta?.scenario?.key ? [{
                  key: 'chart',
                  label: '图表',
                  children: (
                    <Suspense fallback={<div className="result-chart-loading">加载结果图表...</div>}>
                      <LazyQueryResultChart
                        scenarioKey={queryResult.meta.scenario.key}
                        scenarioName={queryResult.meta.scenario.name}
                        data={queryResult.data}
                      />
                    </Suspense>
                  )
                }] : [])
              ]}
            />
          ) : (
            <div className="query-empty-state">
              <Database aria-hidden="true" />
              <Text className="query-empty-title">查询结果为空</Text>
              <Text className="query-empty-copy">请检查时间范围、筛选条件或示例数据是否已导入。</Text>
            </div>
          )}
        </div>
      ) : (
        <div className="query-empty-state result-empty">
          <Code2 aria-hidden="true" />
          <Text className="query-empty-title">还没有运行查询</Text>
          <Text className="query-empty-copy">选择一个场景，或在自定义 SQL 中运行语句后，这里会显示执行摘要和结果表格。</Text>
        </div>
      )}
    </Card>
  )

  // 如果页面正在加载，显示骨架屏
  if (isPageLoading) {
    return <QueryCenterSkeleton />
  }

  return (
    <div className="query-center-container">
      <OfflineDataNotice />

      <header className="query-hero">
        <div className="query-heading">
          <Text className="query-product-label">KWDB 示例 SQL</Text>
          <Title level={1}>运行智能电表查询</Title>
          <Text className="query-subtitle">
            从关系数据、时序数据和跨模型查询场景进入，观察 SQL 如何把智能电表读数与业务信息组合起来。
          </Text>
        </div>

        <div className="query-hero-actions">
          <Button
            icon={<RefreshCw />}
            loading={isLoading}
            onClick={() => {
              queryClient.invalidateQueries(['query-scenarios'])
              queryClient.invalidateQueries(['query-history'])
            }}
          >
            刷新查询页
          </Button>
          <Button
            type="primary"
            icon={<PlayCircle />}
            loading={isLoading}
            onClick={activeTab === 'custom' ? handleCustomExecute : undefined}
            disabled={activeTab !== 'custom'}
          >
            运行自定义 SQL
          </Button>
        </div>
      </header>

      <section className="query-workspace" aria-label="示例 SQL 查询工作台">
        {renderQueryConfigCard('query-config-card--bounded')}

        {renderQueryResultCard('query-result-card--matched')}
      </section>

      {/* 参数输入模态框 */}
      <DialogModal
        title={`${selectedScenario?.name} - 参数设置`}
        className="smart-meter-modal"
        open={parameterModalVisible}
        onOpenChange={setParameterModalVisible}
        footer={[
          <Button key="cancel" onClick={() => setParameterModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleParameterSubmit} loading={isLoading}>
            运行查询
          </Button>
        ]}
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
      </DialogModal>
    </div>
  )
}

export default QueryCenter
