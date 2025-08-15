// 智能电表系统类型定义

// 基础数据类型
export interface BaseResponse<T = any> {
  success: boolean
  data: T
  message?: string
  code?: number
}

// 分页响应类型
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    current: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 电表相关类型
export interface Meter {
  id: string
  name: string
  location: string
  area: string
  status: 'online' | 'offline' | 'maintenance'
  lastReading: number
  lastReadingTime: string
  installDate: string
  model: string
  serialNumber: string
}

// 电表读数类型
export interface MeterReading {
  id: string
  meterId: string
  timestamp: string
  voltage: number
  current: number
  power: number
  energy: number
  frequency: number
  powerFactor: number
}

// 区域类型
export interface Area {
  id: string
  name: string
  description?: string
  meterCount: number
  totalPower: number
}

// 仪表盘数据类型
export interface DashboardData {
  totalMeters: number
  onlineMeters: number
  offlineMeters: number
  totalPower: number
  totalEnergy: number
  averagePowerFactor: number
  alerts: Alert[]
  recentReadings: MeterReading[]
}

// 告警类型
export interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  meterId?: string
  meterName?: string
  resolved: boolean
}

// 可视化数据类型
export interface RegionPowerData {
  region: string
  power: number
  percentage: number
  color?: string
}

export interface PowerTrendData {
  timestamp: string
  power: number
  energy: number
}

export interface MeterStatusData {
  status: string
  count: number
  percentage: number
}

export interface HeatmapData {
  hour: number
  day: number
  value: number
}

export interface GaugeData {
  current: number
  max: number
  unit: string
  status: 'normal' | 'warning' | 'danger'
}

// 查询相关类型
export interface QueryScenario {
  id: string
  name: string
  description: string
  sql: string
  parameters?: QueryParameter[]
  category: string
}

export interface QueryParameter {
  name: string
  type: 'string' | 'number' | 'date' | 'select'
  label: string
  required: boolean
  defaultValue?: any
  options?: { label: string; value: any }[]
}

export interface QueryResult {
  columns: string[]
  rows: any[][]
  totalRows: number
  executionTime: number
  sql: string
}

export interface QueryHistory {
  id: string
  sql: string
  timestamp: string
  executionTime: number
  rowCount: number
  success: boolean
  error?: string
}

// 数据库相关类型
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  ssl: boolean
  connectionTimeout: number
  maxConnections: number
}

export interface DatabaseStatus {
  connected: boolean
  version: string
  uptime: number
  connections: {
    active: number
    idle: number
    total: number
  }
  performance: {
    queriesPerSecond: number
    avgQueryTime: number
    cacheHitRatio: number
  }
}

export interface TableSchema {
  tableName: string
  columns: ColumnInfo[]
  rowCount: number
  size: string
  indexes: IndexInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  comment?: string
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

// 设置相关类型
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  autoRefresh: boolean
  refreshInterval: number
  chartAnimations: boolean
  notifications: {
    alerts: boolean
    updates: boolean
    sound: boolean
  }
  dashboard: {
    defaultTimeRange: number
    showGrid: boolean
    compactMode: boolean
  }
  query: {
    autoComplete: boolean
    syntaxHighlight: boolean
    maxRows: number
  }
}

// 性能监控类型
export interface PerformanceMetrics {
  timestamp: string
  pageLoadTime: number
  apiResponseTime: number
  renderTime: number
  memoryUsage: number
  errorCount: number
  userActions: UserAction[]
}

export interface UserAction {
  type: string
  timestamp: string
  duration: number
  success: boolean
  error?: string
}

// 缓存相关类型
export interface CacheConfig {
  strategy: 'realtime' | 'dashboard' | 'visualization' | 'static' | 'config'
  staleTime: number
  gcTime: number
  refetchInterval?: number
  refetchOnWindowFocus: boolean
  retry: number
}

// 网络状态类型
export interface NetworkStatus {
  online: boolean
  effectiveType: string
  downlink: number
  rtt: number
}

// 组件Props类型
export interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: {
    value: number
    type: 'up' | 'down'
  }
  icon?: React.ReactNode
  loading?: boolean
}

export interface ChartCardProps {
  title: string
  children: React.ReactNode
  loading?: boolean
  error?: string
  onRefresh?: () => void
  extra?: React.ReactNode
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: any[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  rowSelection?: any
  onRow?: (record: T) => any
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  stack?: string
}

// API错误类型
export interface ApiError extends Error {
  response?: {
    status: number
    data: any
  }
  code?: string
}

// 导出所有类型的联合类型
export type ChartData = RegionPowerData | PowerTrendData | MeterStatusData | HeatmapData | GaugeData
export type DatabaseEntity = Meter | Area | MeterReading | Alert
export type QueryEntity = QueryScenario | QueryParameter | QueryResult | QueryHistory
export type SystemEntity = DatabaseConfig | DatabaseStatus | UserSettings | PerformanceMetrics