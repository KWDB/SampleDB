import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  DialogModal,
  Divider,
  Form,
  Input,
  InputNumber,
  Option,
  Select,
  Space,
  Table,
  Tag,
  Text,
  Title,
  useMessage
} from '../components/ui'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleX,
  Database,
  Info,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Table2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../services/api'

const tablePurposeMap = {
  meter_info: '电表基础信息，连接用户、区域与时序读数',
  user_info: '用户档案，用于演示关系数据关联',
  area_info: '区域层级信息，用于按地区分析电表数据',
  alarm_rules: '告警规则，用于说明业务规则与数据检测',
  meter_data: '时序读数，承载电压、电流、功率和能耗数据'
}

const databaseLabels = {
  rdb: '关系数据',
  tsdb: '时序数据',
  defaultdb: '默认库'
}

const tableTypeLabels = {
  'BASE TABLE': '基础表',
  VIEW: '视图',
  'SYSTEM VIEW': '系统视图'
}

const DatabaseManagement = () => {
  const message = useMessage()
  const navigate = useNavigate()
  // 解析版本信息字符串
  const parseVersionInfo = (versionString) => {
    if (!versionString) return {};

    // 解析版本字符串: "KaiwuDB 2.2.0 (aarch64-linux-gnu, built 2025/03/31 07:39:26, go1.16.15, gcc 11.4.0)"
    const versionMatch = versionString.match(/KaiwuDB\s+([\d.]+)/);
    const architectureMatch = versionString.match(/\(([^,]+),/);
    const buildTimeMatch = versionString.match(/built\s+([^,]+),/);
    const goVersionMatch = versionString.match(/go([\d.]+),/);
    const gccVersionMatch = versionString.match(/gcc\s+([\d.]+)\)/);

    return {
      version: versionMatch ? versionMatch[1] : 'Unknown',
      architecture: architectureMatch ? architectureMatch[1] : 'Unknown',
      buildTime: buildTimeMatch ? buildTimeMatch[1] : 'Unknown',
      goVersion: goVersionMatch ? goVersionMatch[1] : 'Unknown',
      gccVersion: gccVersionMatch ? gccVersionMatch[1] : 'Unknown'
    };
  };
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [generateDataModalVisible, setGenerateDataModalVisible] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [tableDetailModalVisible, setTableDetailModalVisible] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableDataPage, setTableDataPage] = useState(1)
  const [tableDataPageSize, setTableDataPageSize] = useState(20)
  const [form] = Form.useForm()
  const [generateForm] = Form.useForm()

  const queryClient = useQueryClient()

  // 动态生成表格列
  const getTableDataColumns = (records) => {
    if (!records || records.length === 0) return []

    const firstRecord = records[0]
    return Object.keys(firstRecord).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      width: 150,
      ellipsis: true,
      render: (text) => {
        if (text === null || text === undefined) {
          return <Text type="secondary">NULL</Text>
        }
        if (typeof text === 'object') {
          return <Text code>{JSON.stringify(text)}</Text>
        }

        const stringValue = String(text)
        // 检查是否包含换行符
        if (stringValue.includes('\n')) {
          return (
            <Text>
              <div className="text-with-newlines">
                {stringValue}
              </div>
            </Text>
          )
        }

        return <Text>{stringValue}</Text>
      }
    }))
  }

  // 获取数据库连接状态
  const { data: connectionStatus, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['database-status'],
    queryFn: api.database.getStatus,
    refetchInterval: 10000, // 每10秒刷新一次
  })

  // 获取数据库配置
  const { data: config, isLoading: _configLoading } = useQuery({
    queryKey: ['database-config'],
    queryFn: api.database.getConfig,
  })

  // 获取数据库统计信息
  const { data: statistics, refetch: refetchStatistics } = useQuery({
    queryKey: ['database-statistics'],
    queryFn: api.database.getStats,
    refetchInterval: 30000, // 每30秒刷新一次
  })

  // 获取表结构信息
  const { data: tableInfo, isLoading: tableLoading, error: tableError, refetch: refetchTables } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => api.database.getSchema('mixed'),
  })

  // 获取系统信息
  const { data: systemInfo, isLoading: systemLoading, error: systemError } = useQuery({
    queryKey: ['database-system'],
    queryFn: api.database.getInfo,
  })

  // 获取表数据
  const { data: tableData, isLoading: tableDataLoading, refetch: refetchTableData } = useQuery({
    queryKey: ['table-data', selectedTable?.database, selectedTable?.table_name, tableDataPage, tableDataPageSize],
    queryFn: () => api.database.getTableData(selectedTable.database, selectedTable.table_name, tableDataPage, tableDataPageSize),
    enabled: !!selectedTable && tableDetailModalVisible,
  })

  // 生成测试数据的mutation
  const generateDataMutation = useMutation({
    mutationFn: api.database.generateData,
    onSuccess: (data) => {
      message.success(data.message || '测试数据生成成功')
      setGenerateDataModalVisible(false)
      generateForm.resetFields()
      // 刷新统计数据
      refetchStatistics()
    },
    onError: (error) => {
      message.error(error.message || '生成测试数据失败')
    }
  })

  // 测试连接
  const testConnectionMutation = useMutation({
    mutationFn: api.database.testConnection,
    onSuccess: (data) => {
      if (data.success) {
        message.success('数据库连接测试成功')
      } else {
        message.error(`连接测试失败: ${data.error}`)
      }
      queryClient.invalidateQueries(['database-status'])
    },
    onError: (error) => {
      message.error(`连接测试失败: ${error.message}`)
    },
  })

  // 处理连接测试
  const handleTestConnection = () => {
    setTestingConnection(true)
    testConnectionMutation.mutate()
    setTimeout(() => setTestingConnection(false), 2000)
  }

  // 刷新所有数据
  const refreshAllData = () => {
    refetchStatus()
    refetchStatistics()
    refetchTables()
  }

  // 处理生成测试数据
  const handleGenerateData = () => {
    generateForm.validateFields().then(values => {
      generateDataMutation.mutate(values.count)
    })
  }

  // 表结构列配置
  const tableColumns = [
    {
      title: '表名',
      dataIndex: 'table_name',
      key: 'table_name',
      render: (name) => (
        <div className="schema-name-cell">
          <Space size={8}>
            <Table2 className="schema-table-icon" />
            <Text strong>{name}</Text>
          </Space>
          <Text className="schema-purpose">{tablePurposeMap[name] || '用于 KWDB 示例查询的数据表'}</Text>
        </div>
      )
    },
    {
      title: '数据库',
      dataIndex: 'database',
      key: 'database',
      render: (db) => (
        <Tag className={`schema-tag db-${db || 'unknown'}`}>
          {db?.toUpperCase()} · {databaseLabels[db] || '数据库'}
        </Tag>
      )
    },
    {
      title: '表类型',
      dataIndex: 'table_type',
      key: 'table_type',
      render: (type) => (
        <Tag className="schema-tag neutral">
          {tableTypeLabels[type] || type}
        </Tag>
      )
    },
    {
      title: '列数',
      dataIndex: 'column_count',
      key: 'column_count',
      render: (count) => count || 0
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            size="small"
            className="schema-row-action"
            onClick={() => {
              setSelectedTable(record);
              setTableDetailModalVisible(true);
            }}
          >
            查看详情
          </Button>
        </Space>
      )
    }
  ]

  // 获取连接状态颜色和图标
  const getConnectionStatus = (status) => {
    switch (status) {
      case 'connected':
        return { color: 'success', tone: 'success', icon: <CheckCircle2 />, text: '已连接' }
      case 'disconnected':
        return { color: 'error', tone: 'error', icon: <CircleX />, text: '未连接' }
      case 'connecting':
        return { color: 'processing', tone: 'pending', icon: <RefreshCw className="ui-icon-spin" />, text: '连接中' }
      default:
        return { color: 'warning', tone: 'warning', icon: <AlertTriangle />, text: '未知' }
    }
  }

  const tableRows = tableInfo?.data || []
  const rdbSchemaTables = tableRows.filter(table => table.database === 'rdb')
  const tsdbSchemaTables = tableRows.filter(table => table.database === 'tsdb')
  const rdbTableCount = statistics?.data?.rdb?.tables?.length ?? rdbSchemaTables.length
  const tsdbTableCount = statistics?.data?.tsdb?.tables?.length ?? tsdbSchemaTables.length
  const systemVersionInfo = parseVersionInfo(systemInfo?.data?.version)
  const connectionSummary = statusLoading
    ? {
        tone: 'pending',
        icon: <RefreshCw className="ui-icon-spin" />,
        title: '正在检查 KWDB 连接',
        detail: '正在读取 RDB 与 TSDB 的连接状态。'
      }
    : statusError
      ? {
          tone: 'error',
          icon: <CircleX />,
          title: '无法读取 KWDB 连接状态',
          detail: '请确认后端服务和 KWDB 示例数据库已启动，然后刷新状态。'
        }
    : connectionStatus?.data?.connected
      ? {
          tone: 'success',
          icon: <CheckCircle2 />,
          title: 'KWDB 示例环境已连接',
          detail: '关系数据与时序数据都可以用于后续查询演示。'
        }
      : connectionStatus?.data
        ? {
            tone: 'error',
            icon: <CircleX />,
            title: 'KWDB 示例环境未完全连接',
            detail: '请检查本地 KWDB 容器、端口配置或重新测试连接。'
          }
        : {
            tone: 'warning',
            icon: <AlertTriangle />,
            title: '等待连接状态',
            detail: '页面已加载，连接状态将在请求完成后更新。'
          }

  const connectionRows = [
    {
      key: 'RDB',
      label: 'RDB',
      role: '关系数据',
      status: getConnectionStatus(connectionStatus?.data?.rdbStatus),
      latency: connectionStatus?.data?.latency?.rdb
    },
    {
      key: 'TSDB',
      label: 'TSDB',
      role: '时序数据',
      status: getConnectionStatus(connectionStatus?.data?.tsdbStatus),
      latency: connectionStatus?.data?.latency?.tsdb
    }
  ]

  return (
    <div className="database-management-container">
      <header className="overview-hero">
        <div className="overview-heading">
          <Text className="overview-product-label">KWDB 智能电表示例</Text>
          <Title level={1}>智能电表示例概览</Title>
          <Text className="overview-subtitle">
            查看 KWDB 中关系数据、时序数据和跨模型查询所依赖的示例结构。
          </Text>
        </div>

        <Space className="overview-actions" size={8} wrap>
          <Button icon={<RefreshCw />} onClick={refreshAllData}>
            刷新状态
          </Button>
          <Button icon={<Settings />} onClick={() => setConfigModalVisible(true)}>
            查看配置
          </Button>
          <Button icon={<Search />} type="primary" onClick={() => navigate('/query')}>
            打开示例 SQL
          </Button>
        </Space>
      </header>

      <section className={`overview-status-panel status-${connectionSummary.tone}`}>
        <div className="status-copy">
          <span className="status-icon" aria-hidden="true">{connectionSummary.icon}</span>
          <div>
            <Text className="status-title">{connectionSummary.title}</Text>
            <Text className="status-detail">{connectionSummary.detail}</Text>
          </div>
        </div>
        <div className="connection-strip" aria-label="数据库连接状态">
          {connectionRows.map(item => (
            <div className="connection-node" key={item.key}>
              <span className={`connection-state-dot tone-${item.status.tone}`} aria-hidden="true" />
              <div>
                <Text className="connection-node-label">{item.label}</Text>
                <Text className="connection-node-meta">
                  {item.role} · {item.status.text}
                  {typeof item.latency === 'number' ? ` · ${item.latency}ms` : ''}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overview-workspace" aria-label="KWDB 示例学习概览">
        <Card className="overview-panel data-model-panel">
          <div className="section-heading">
            <div>
              <Text className="section-label">数据模型</Text>
              <Title level={2}>RDB 与 TSDB 如何组成这个示例</Title>
            </div>
            <Text className="section-meta">{tableRows.length} 张表</Text>
          </div>

          <div className="model-lanes">
            <div className="model-lane">
              <div className="model-lane-icon">
                <Database />
              </div>
              <div className="model-lane-body">
                <Text className="model-lane-title">RDB 关系数据</Text>
                <Text className="model-lane-copy">
                  保存电表、用户、区域和告警规则，负责解释每条读数的业务背景。
                </Text>
              </div>
              <Text className="model-lane-count">{rdbTableCount} 表</Text>
            </div>

            <div className="model-lane">
              <div className="model-lane-icon">
                <BarChart3 />
              </div>
              <div className="model-lane-body">
                <Text className="model-lane-title">TSDB 时序数据</Text>
                <Text className="model-lane-copy">
                  保存智能电表随时间变化的电压、电流、功率和能耗读数。
                </Text>
              </div>
              <Text className="model-lane-count">{tsdbTableCount} 表</Text>
            </div>
          </div>
        </Card>

        <Card className="overview-panel learning-panel">
          <div className="section-heading compact">
            <div>
              <Text className="section-label">学习路径</Text>
              <Title level={2}>建议按这个顺序理解示例</Title>
            </div>
          </div>

          <ol className="learning-steps">
            <li>
              <span>1</span>
              <div>
                <Text className="step-title">确认 KWDB 连接</Text>
                <Text className="step-copy">先确认 RDB 与 TSDB 都可访问，避免查询页出现误导性错误。</Text>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <Text className="step-title">查看表结构</Text>
                <Text className="step-copy">理解关系表如何补充时序读数的电表、用户和区域语义。</Text>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <Text className="step-title">运行示例 SQL</Text>
                <Text className="step-copy">进入查询页观察跨模型查询如何组合关系数据与时序数据。</Text>
              </div>
            </li>
          </ol>
        </Card>
      </section>

      <Card
        className="overview-panel system-info-card"

        loading={systemLoading}
      >
        <div className="section-heading">
          <div>
            <Text className="section-label">运行环境</Text>
            <Title level={2}>当前 KWDB 实例</Title>
          </div>
          <Info className="section-icon" />
        </div>

        {systemError ? (
          <Alert
            className="overview-state-alert"
            message="无法读取 KWDB 实例信息"
            description="请确认后端 API 可访问，再刷新状态。这个信息不影响你查看页面结构。"
            type="warning"
            showIcon
          />
        ) : systemInfo?.data?.version ? (
          <Descriptions className="system-descriptions" column={{ xs: 1, sm: 2, lg: 3 }} size="small">
            <Descriptions.Item label="KWDB 版本">
              <Tag className="schema-tag neutral">{systemVersionInfo.version || 'Unknown'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="系统架构">
              <Text code>{systemVersionInfo.architecture || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="编译时间">
              <Text code>{systemVersionInfo.buildTime || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Go 版本">
              <Text code>go{systemVersionInfo.goVersion || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="GCC 版本">
              <Text code>gcc {systemVersionInfo.gccVersion || 'Unknown'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {systemInfo.data.timestamp ? dayjs(systemInfo.data.timestamp).format('YYYY-MM-DD HH:mm:ss') : 'Unknown'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text className="empty-copy">暂无系统版本信息。请检查 KWDB 连接后刷新状态。</Text>
        )}
      </Card>

      <Card
        className="overview-panel table-info-card"

        loading={tableLoading}
      >
        <div className="schema-toolbar">
          <div className="section-heading compact">
            <div>
              <Text className="section-label">表结构</Text>
              <Title level={2}>示例数据表</Title>
              <Text className="section-copy">
                共 {tableRows.length} 张表，关系表解释业务语义，时序表承载电表读数。
              </Text>
            </div>
          </div>
          <Space size={8} wrap>
            <Button type="text" icon={<Plus />} onClick={() => setGenerateDataModalVisible(true)}>
              生成测试数据
            </Button>
            <Button type="text" icon={<RefreshCw />} onClick={refetchTables}>
              刷新表结构
            </Button>
          </Space>
        </div>

        {tableError ? (
          <Alert
            className="overview-state-alert"
            message="无法读取表结构"
            description="请先确认 KWDB 容器、后端服务和示例数据导入状态。连接恢复后点击“刷新表结构”。"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={refetchTables}>
                刷新表结构
              </Button>
            }
          />
        ) : !tableLoading && tableRows.length === 0 ? (
          <Alert
            className="overview-state-alert"
            message="暂未读取到示例数据表"
            description="如果这是首次运行，请先导入 smart-meter 示例数据；也可以生成测试数据后再次刷新。"
            type="info"
            showIcon
            action={
              <Button size="small" onClick={() => setGenerateDataModalVisible(true)}>
                生成测试数据
              </Button>
            }
          />
        ) : (
          <Table
            className="smart-table schema-table"
            dataSource={tableRows}
            columns={tableColumns}
            rowKey={(record) => `${record.database}-${record.table_name}`}
            size="middle"
            scroll={{ x: true }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 张表`
            }}
          />
        )}
      </Card>

      {/* 配置模态框 */}
      <DialogModal
        title="数据库配置"
        className="smart-meter-modal"
        open={configModalVisible}
        onOpenChange={setConfigModalVisible}
        footer={[
          <Button key="cancel" onClick={() => setConfigModalVisible(false)}>
            取消
          </Button>,
          <Button key="test" onClick={handleTestConnection} loading={testingConnection}>
            测试连接
          </Button>,
          <Button key="save" type="primary" disabled>
            保存配置
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="配置信息"
          description="当前配置为只读模式，如需修改请联系系统管理员或修改环境变量。"
          type="info"
          style={{ marginBottom: 16 }}
        />

        {config?.data && (
          <Form
            form={form}
            layout="vertical"
            disabled
            initialValues={{
              host: config.data.host,
              port: config.data.port,
              user: config.data.user,
              ssl_mode: config.data.ssl_mode,
              connect_timeout: config.data.connect_timeout,
              max_connections: config.data.max_connections,
              idle_timeout: config.data.idle_timeout
            }}
          >
            <div className="ui-form-grid">
              <div>
                <Form.Item label="主机地址" name="host">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="端口" name="port">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="用户名" name="user">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="密码">
                  <Input.Password placeholder="******" />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="SSL模式" name="ssl_mode">
                  <Select>
                    <Option value="disable">禁用</Option>
                    <Option value="require">必需</Option>
                    <Option value="prefer">首选</Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item label="连接超时(秒)" name="connect_timeout">
                  <InputNumber min={1} max={60} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="最大连接数" name="max_connections">
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="空闲超时(秒)" name="idle_timeout">
                  <InputNumber min={60} max={3600} style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </div>
          </Form>
        )}
      </DialogModal>

      {/* 生成测试数据模态框 */}
      <DialogModal
        title="生成测试数据"
        className="smart-meter-modal"
        open={generateDataModalVisible}
        onOpenChange={(open) => {
          setGenerateDataModalVisible(open)
          if (!open) generateForm.resetFields()
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setGenerateDataModalVisible(false)
            generateForm.resetFields()
          }}>
            取消
          </Button>,
          <Button
            key="generate"
            type="primary"
            onClick={handleGenerateData}
            loading={generateDataMutation.isPending}
            icon={<Plus />}
          >
            生成数据
          </Button>
        ]}
        width={500}
      >
        <Alert
          message="生成测试数据"
          description="此功能将向时序数据库(TSDB)的meter_data表中插入指定数量的模拟智能电表数据，用于测试和演示。数据包含电压、电流、功率、能耗等信息。"
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Form
          form={generateForm}
          layout="vertical"
          initialValues={{ count: 10000 }}
        >
          <Form.Item
            label="数据条数"
            name="count"
            rules={[
              { required: true, message: '请输入数据条数' },
              { type: 'number', min: 1, max: 100000, message: '数据条数必须在1-100000之间' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100000}
              step={1000}
              placeholder="请输入要生成的数据条数"
            />
          </Form.Item>

          <Alert
            message="数据生成说明"
            description={
              <div>
                <p>• 数据将按时间倒序生成，每条记录间隔10分钟</p>
                <p>• 电表ID范围：M1-M100（循环使用）</p>
                <p>• 电压范围：220V ± 10V</p>
                <p>• 电流范围：5A ± 1.5A</p>
                <p>• 功率范围：1000W ± 1000W</p>
                <p>• 能耗：递增累计值</p>
              </div>
            }
            type="warning"
            style={{ marginTop: 16 }}
          />
        </Form>
      </DialogModal>

      {/* 表详情模态框 */}
      <DialogModal
        title={
          <Space>
            <Database />
            <span>{selectedTable?.table_name} - 表数据</span>
            <Tag className={`schema-tag db-${selectedTable?.database || 'unknown'}`}>
              {selectedTable?.database?.toUpperCase()}
            </Tag>
          </Space>
        }
        className="smart-meter-modal table-detail-modal"
        open={tableDetailModalVisible}
        onOpenChange={(open) => {
          setTableDetailModalVisible(open)
          if (!open) {
            setSelectedTable(null)
            setTableDataPage(1)
          }
        }}
        footer={[
          <Button key="refresh" icon={<RefreshCw />} onClick={refetchTableData}>
            刷新数据
          </Button>,
          <Button key="close" onClick={() => {
            setTableDetailModalVisible(false)
            setSelectedTable(null)
            setTableDataPage(1)
          }}>
            关闭
          </Button>
        ]}
        width={1200}
      >
        {selectedTable && (
          <div>
            <Alert
              message="表信息"
              description={
                <Space split={<Divider type="vertical" />}>
                  <Text>表类型: <Tag className="schema-tag neutral">{tableTypeLabels[selectedTable.table_type] || selectedTable.table_type}</Tag></Text>
                  <Text>列数: {selectedTable.column_count || 0}</Text>
                  <Text>总记录数: {tableData?.data?.pagination?.total || 0}</Text>
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Table
              className="smart-table table-detail-table"
              dataSource={tableData?.data?.records || []}
              columns={getTableDataColumns(tableData?.data?.records)}
              rowKey={(record, index) => `row-${index}-${record.id || record.meter_id || record.timestamp || Object.values(record).slice(0, 3).join('-')}`}
              loading={tableDataLoading}
              scroll={{ x: true, y: 400 }}
              pagination={{
                current: tableDataPage,
                pageSize: tableDataPageSize,
                total: tableData?.data?.pagination?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                onChange: (page, size) => {
                  setTableDataPage(page)
                  setTableDataPageSize(size)
                },
                onShowSizeChange: (_current, size) => {
                  setTableDataPage(1)
                  setTableDataPageSize(size)
                }
              }}
              size="small"
            />
          </div>
        )}
      </DialogModal>
    </div>
  )
}

export default DatabaseManagement
