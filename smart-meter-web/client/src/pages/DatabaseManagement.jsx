import React, { useState } from 'react'
import {
  Row, Col, Card, Table, Button, Space, Typography, Tag, Alert,
  Descriptions, Statistic, Modal, Form, Input, InputNumber,
  Select, Divider, Badge, Avatar, App
} from 'antd'
import {
  DatabaseOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  TableOutlined,
  BarChartOutlined,
  // CloudServerOutlined, // 未使用
  PlusOutlined,
  MonitorOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../services/api'

const { Title, Text } = Typography
const { Option } = Select

const DatabaseManagement = () => {
  const { message } = App.useApp()
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
  const { data: connectionStatus, isLoading: _statusLoading, refetch: refetchStatus } = useQuery({
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
  const { data: statistics, isLoading: _statisticsLoading, refetch: refetchStatistics } = useQuery({
    queryKey: ['database-statistics'],
    queryFn: api.database.getStats,
    refetchInterval: 30000, // 每30秒刷新一次
  })

  // 获取表结构信息
  const { data: tableInfo, isLoading: tableLoading, refetch: refetchTables } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => api.database.getSchema('mixed'),
  })

  // 获取系统信息
  const { data: systemInfo, isLoading: systemLoading } = useQuery({
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
        <Space>
          <TableOutlined />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: '数据库',
      dataIndex: 'database',
      key: 'database',
      render: (db) => {
        const colors = {
          'rdb': 'blue',
          'tsdb': 'green',
          'defaultdb': 'orange'
        }
        return <Tag color={colors[db] || 'default'}>{db.toUpperCase()}</Tag>
      }
    },
    {
      title: '表类型',
      dataIndex: 'table_type',
      key: 'table_type',
      render: (type) => {
        const colors = {
          'BASE TABLE': 'blue',
          'VIEW': 'green',
          'SYSTEM VIEW': 'orange'
        }
        return <Tag color={colors[type] || 'default'}>{type}</Tag>
      }
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
            type="link" 
            size="small"
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
        return { color: 'success', icon: <CheckCircleOutlined />, text: '已连接' }
      case 'disconnected':
        return { color: 'error', icon: <CloseCircleOutlined />, text: '未连接' }
      case 'connecting':
        return { color: 'processing', icon: <ReloadOutlined spin />, text: '连接中' }
      default:
        return { color: 'warning', icon: <WarningOutlined />, text: '未知' }
    }
  }

  return (
    <div className="database-management-container">
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>概览</Title>
        
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshAllData}
          >
            刷新
          </Button>
          <Button 
            icon={<PlusOutlined />} 
            type="primary"
            onClick={() => setGenerateDataModalVisible(true)}
          >
            生成测试数据
          </Button>
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setConfigModalVisible(true)}
          >
            配置
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* 数据库统计概览 */}
        <Col xs={24}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card className="stats-card" hoverable style={{ borderLeft: '4px solid #1890ff' }}>
                <Statistic
                     title="RDB 表数量"
                     value={statistics?.data?.rdb?.tables?.length || 0}
                     prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
                     valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
                     suffix="个"
                   />
                <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                  关系数据表
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stats-card" hoverable style={{ borderLeft: '4px solid #52c41a' }}>
                <Statistic
                     title="TSDB 表数量"
                     value={statistics?.data?.tsdb?.tables?.length || 0}
                     prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
                     valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
                     suffix="个"
                   />
                <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                  时序数据表
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stats-card" hoverable style={{ borderLeft: '4px solid #fa8c16' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <Tag 
                      color={getConnectionStatus(connectionStatus?.data?.rdbStatus).color}
                      icon={getConnectionStatus(connectionStatus?.data?.rdbStatus).icon}
                      style={{ fontSize: '11px', margin: 0 }}
                    >
                      {getConnectionStatus(connectionStatus?.data?.rdbStatus).text}
                    </Tag>
                  </div>
                  <Statistic
                    title="RDB 连接延迟"
                    value={connectionStatus?.data?.latency?.rdb || 0}
                    prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                    valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: 'bold' }}
                    suffix="ms"
                  />
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    关系数据表
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stats-card" hoverable style={{ borderLeft: '4px solid #722ed1' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <Tag 
                      color={getConnectionStatus(connectionStatus?.data?.tsdbStatus).color}
                      icon={getConnectionStatus(connectionStatus?.data?.tsdbStatus).icon}
                      style={{ fontSize: '11px', margin: 0 }}
                    >
                      {getConnectionStatus(connectionStatus?.data?.tsdbStatus).text}
                    </Tag>
                  </div>
                  <Statistic
                    title="TSDB 连接延迟"
                    value={connectionStatus?.data?.latency?.tsdb || 0}
                    prefix={<MonitorOutlined style={{ color: '#722ed1' }} />}
                    valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
                    suffix="ms"
                  />
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    时序数据表
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 系统信息 */}
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <Avatar size="small" style={{ backgroundColor: '#fa8c16' }}>
                  <InfoCircleOutlined />
                </Avatar>
                <span>系统详细信息</span>
              </Space>
            }
            className="system-info-card"
            style={{ height: '100%' }}
            loading={systemLoading}
            extra={null}
          >
            {systemInfo?.data?.version && (() => {
              const versionInfo = parseVersionInfo(systemInfo.data.version);
              return (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="KWDB版本">
                    <Tag color="blue">{versionInfo.version || 'Unknown'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="系统架构">
                    <Tag color="green">{versionInfo.architecture || 'Unknown'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="编译时间">
                    <Text code>{versionInfo.buildTime || 'Unknown'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Go版本">
                    <Tag color="orange">go{versionInfo.goVersion || 'Unknown'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="GCC版本">
                    <Tag color="purple">gcc {versionInfo.gccVersion || 'Unknown'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {systemInfo.data.timestamp ? dayjs(systemInfo.data.timestamp).format('YYYY-MM-DD HH:mm:ss') : 'Unknown'}
                  </Descriptions.Item>
                </Descriptions>
              );
            })()}
          </Card>
        </Col>

        {/* 表结构信息 */}
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <Avatar size="small" style={{ backgroundColor: '#722ed1' }}>
                  <TableOutlined />
                </Avatar>
                <span>数据表结构</span>
                <Badge count={tableInfo?.data?.length || 0} style={{ backgroundColor: '#722ed1' }} />
              </Space>
            }
            className="table-info-card"
            loading={tableLoading}
            extra={
              <Space>
                <Text type="secondary">共 {tableInfo?.data?.length || 0} 个表</Text>
                <Button 
                  type="text" 
                  icon={<ReloadOutlined />} 
                  onClick={refetchTables}
                  size="small"
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Table
              dataSource={tableInfo?.data || []}
              columns={tableColumns}
              rowKey="table_name"
              size="small"
              scroll={{ x: true }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个表`
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 配置模态框 */}
      <Modal
        title="数据库配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
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
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="主机地址" name="host">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="端口" name="port">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="用户名" name="user">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="密码">
                  <Input.Password placeholder="******" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="SSL模式" name="ssl_mode">
                  <Select>
                    <Option value="disable">禁用</Option>
                    <Option value="require">必需</Option>
                    <Option value="prefer">首选</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="连接超时(秒)" name="connect_timeout">
                  <InputNumber min={1} max={60} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大连接数" name="max_connections">
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="空闲超时(秒)" name="idle_timeout">
                  <InputNumber min={60} max={3600} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* 生成测试数据模态框 */}
      <Modal
        title="生成测试数据"
        open={generateDataModalVisible}
        onCancel={() => {
          setGenerateDataModalVisible(false)
          generateForm.resetFields()
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
            icon={<PlusOutlined />}
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
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
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
      </Modal>

      {/* 表详情模态框 */}
      <Modal
        title={
          <Space>
            <DatabaseOutlined />
            <span>{selectedTable?.table_name} - 表数据</span>
            <Tag color={selectedTable?.database === 'rdb' ? 'blue' : 'green'}>
              {selectedTable?.database?.toUpperCase()}
            </Tag>
          </Space>
        }
        open={tableDetailModalVisible}
        onCancel={() => {
          setTableDetailModalVisible(false)
          setSelectedTable(null)
          setTableDataPage(1)
        }}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={refetchTableData}>
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
        style={{ top: 20 }}
      >
        {selectedTable && (
          <div>
            {/* 表基本信息 */}
            <Alert
              message="表信息"
              description={
                <Space split={<Divider type="vertical" />}>
                  <Text>表类型: <Tag color="blue">{selectedTable.table_type}</Tag></Text>
                  <Text>列数: {selectedTable.column_count || 0}</Text>
                  <Text>总记录数: {tableData?.data?.pagination?.total || 0}</Text>
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            {/* 表数据 */}
            <Table
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
                onShowSizeChange: (current, size) => {
                  setTableDataPage(1)
                  setTableDataPageSize(size)
                }
              }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DatabaseManagement