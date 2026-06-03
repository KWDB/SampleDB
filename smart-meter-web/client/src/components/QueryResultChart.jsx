import React from 'react'
import { BarChart, LineChart } from 'echarts/charts'
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent
])

const chartPalette = ['#3f5fdb', '#18794e', '#8a5a00', '#7c3aed', '#c02525', '#0f766e']

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumber = (value) => {
  const parsed = toNumber(value)
  return parsed === null ? '-' : parsed.toLocaleString()
}

const formatTimeLabel = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const pad = number => String(number).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const truncateLabel = (value, length = 14) => {
  const text = String(value ?? '-')
  return text.length > length ? `${text.slice(0, length)}...` : text
}

const formatCategoryLabel = (key, value) => {
  if (/(^ts$|start|end|time|bucket)/i.test(key)) return formatTimeLabel(value)
  return value || '-'
}

const sortByMetric = (data, valueKey, direction = 'desc') => (
  [...data].sort((a, b) => {
    const left = toNumber(a[valueKey]) ?? 0
    const right = toNumber(b[valueKey]) ?? 0
    return direction === 'asc' ? left - right : right - left
  })
)

const countBy = (data, key) => {
  const map = new Map()
  data.forEach(row => {
    const label = row[key] || '未分类'
    map.set(label, (map.get(label) || 0) + 1)
  })
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

const getBaseOption = (summary) => ({
  color: chartPalette,
  aria: {
    enabled: true,
    description: summary
  },
  tooltip: {
    trigger: 'axis',
    confine: true,
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    textStyle: {
      color: '#111827',
      fontSize: 12
    },
    valueFormatter: formatNumber
  },
  legend: {
    top: 0,
    right: 0,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: {
      color: '#4b5563',
      fontSize: 12
    }
  },
  grid: {
    top: 42,
    right: 18,
    bottom: 40,
    left: 54,
    containLabel: true
  },
  animationDuration: 180,
  animationEasing: 'cubicOut'
})

const axisLine = {
  lineStyle: {
    color: '#d1d5db'
  }
}

const axisLabel = {
  color: '#5b6472',
  fontSize: 11
}

const splitLine = {
  lineStyle: {
    color: '#eef0f3'
  }
}

const createHorizontalBar = (data, {
  labelKey,
  valueKey,
  seriesName,
  title,
  description,
  limit = 20
}) => {
  const rows = sortByMetric(data, valueKey).slice(0, limit)
  if (!rows.length) return null

  const labels = rows.map(row => row[labelKey] || '-')
  const values = rows.map(row => toNumber(row[valueKey]) ?? 0)
  const topLabel = labels[0]
  const summary = `${title}: ${topLabel} 最高，数值 ${formatNumber(values[0])}。`

  return {
    title,
    description,
    summary,
    height: Math.min(460, Math.max(300, rows.length * 30 + 110)),
    option: {
      ...getBaseOption(summary),
      tooltip: {
        ...getBaseOption(summary).tooltip,
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: labels,
        axisLine,
        axisLabel: {
          ...axisLabel,
          formatter: value => truncateLabel(value, 18)
        }
      },
      series: [{
        name: seriesName,
        type: 'bar',
        data: values,
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [0, 4, 4, 0]
        }
      }]
    }
  }
}

const createCountBar = (data, {
  groupKey,
  seriesName,
  title,
  description
}) => {
  const rows = countBy(data, groupKey)
  if (!rows.length) return null

  const summary = `${title}: ${rows[0].label} 数量最多，共 ${formatNumber(rows[0].value)} 条。`

  return {
    title,
    description,
    summary,
    height: Math.min(420, Math.max(300, rows.length * 30 + 110)),
    option: {
      ...getBaseOption(summary),
      tooltip: {
        ...getBaseOption(summary).tooltip,
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: rows.map(row => row.label),
        axisLine,
        axisLabel: {
          ...axisLabel,
          formatter: value => truncateLabel(value, 18)
        }
      },
      series: [{
        name: seriesName,
        type: 'bar',
        data: rows.map(row => row.value),
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [0, 4, 4, 0]
        }
      }]
    }
  }
}

const createLineChart = (data, {
  xKey,
  series,
  title,
  description
}) => {
  const rows = [...data].sort((a, b) => new Date(a[xKey]).getTime() - new Date(b[xKey]).getTime())
  if (!rows.length) return null

  const labels = rows.map(row => formatTimeLabel(row[xKey]))
  const summary = `${title}: 展示 ${rows.length} 个时间窗口的 ${series.map(item => item.name).join('、')}。`

  return {
    title,
    description,
    summary,
    height: 340,
    option: {
      ...getBaseOption(summary),
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLine,
        axisLabel: {
          ...axisLabel,
          hideOverlap: true
        }
      },
      yAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      series: series.map((item, index) => ({
        name: item.name,
        type: 'line',
        data: rows.map(row => toNumber(row[item.key]) ?? null),
        smooth: true,
        showSymbol: rows.length <= 24,
        symbolSize: 5,
        lineStyle: {
          width: 2,
          type: item.dashed ? 'dashed' : 'solid'
        },
        itemStyle: {
          color: chartPalette[index % chartPalette.length]
        }
      }))
    }
  }
}

const createBarLineChart = (data, {
  xKey,
  barKey,
  lineKey,
  barName,
  lineName,
  title,
  description,
  sortKey,
  limit = 16
}) => {
  const rows = (sortKey ? sortByMetric(data, sortKey) : [...data]).slice(0, limit)
  if (!rows.length) return null

  const labels = rows.map(row => formatCategoryLabel(xKey, row[xKey]))
  const summary = `${title}: ${labels[0]} 的 ${barName} 为 ${formatNumber(rows[0][barKey])}。`

  return {
    title,
    description,
    summary,
    height: 340,
    option: {
      ...getBaseOption(summary),
      xAxis: {
        type: 'category',
        data: labels,
        axisLine,
        axisLabel: {
          ...axisLabel,
          rotate: rows.length > 8 ? 28 : 0,
          formatter: value => truncateLabel(value, 12)
        }
      },
      yAxis: [
        {
          type: 'value',
          name: barName,
          axisLine,
          axisLabel,
          splitLine
        },
        {
          type: 'value',
          name: lineName,
          axisLine,
          axisLabel,
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: barName,
          type: 'bar',
          data: rows.map(row => toNumber(row[barKey]) ?? 0),
          barMaxWidth: 18,
          itemStyle: {
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: lineName,
          type: 'line',
          yAxisIndex: 1,
          data: rows.map(row => toNumber(row[lineKey]) ?? null),
          smooth: true,
          symbolSize: 5,
          lineStyle: { width: 2 }
        }
      ]
    }
  }
}

const createMeterLoadChart = (data) => {
  const timeKeys = [...new Set(data.map(row => String(row.bucket_start)))]
  const meterIds = [...new Set(data.map(row => row.meter_id || '未知电表'))]
  if (!timeKeys.length || !meterIds.length) return null

  const lookup = new Map(data.map(row => [`${row.meter_id || '未知电表'}|${String(row.bucket_start)}`, row]))
  const summary = `分时负荷统计: 对比 ${meterIds.join('、')} 在 ${timeKeys.length} 个小时窗口内的平均功率和峰值功率。`

  return {
    title: '分时负荷曲线',
    description: '按 time_bucket 小时窗口对比重点电表的平均功率与峰值功率。',
    summary,
    height: 380,
    option: {
      ...getBaseOption(summary),
      legend: {
        ...getBaseOption(summary).legend,
        type: 'scroll'
      },
      xAxis: {
        type: 'category',
        data: timeKeys.map(formatTimeLabel),
        boundaryGap: false,
        axisLine,
        axisLabel: {
          ...axisLabel,
          hideOverlap: true
        }
      },
      yAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      series: meterIds.flatMap((meterId, meterIndex) => ([
        {
          name: `${meterId} 平均功率`,
          type: 'line',
          data: timeKeys.map(timeKey => toNumber(lookup.get(`${meterId}|${timeKey}`)?.avg_power)),
          smooth: true,
          showSymbol: timeKeys.length <= 24,
          lineStyle: {
            width: 2,
            color: chartPalette[meterIndex % chartPalette.length]
          },
          itemStyle: {
            color: chartPalette[meterIndex % chartPalette.length]
          }
        },
        {
          name: `${meterId} 峰值功率`,
          type: 'line',
          data: timeKeys.map(timeKey => toNumber(lookup.get(`${meterId}|${timeKey}`)?.max_power)),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1.5,
            type: 'dashed',
            color: chartPalette[meterIndex % chartPalette.length]
          },
          itemStyle: {
            color: chartPalette[meterIndex % chartPalette.length]
          }
        }
      ]))
    }
  }
}

const createStackedStatusChart = (data) => {
  const areas = [...new Set(data.map(row => row.area_name || '未知区域'))]
  const statuses = [...new Set(data.map(row => row.status || '未知状态'))]
  if (!areas.length || !statuses.length) return null

  const lookup = new Map(data.map(row => [`${row.area_name || '未知区域'}|${row.status || '未知状态'}`, row]))
  const summary = `电表概要统计: 展示 ${areas.length} 个区域内不同电表状态的数量分布。`

  return {
    title: '区域电表状态分布',
    description: '按区域堆叠展示电表状态数量，用于快速观察故障或离线状态集中在哪些区域。',
    summary,
    height: Math.min(460, Math.max(320, areas.length * 30 + 120)),
    option: {
      ...getBaseOption(summary),
      tooltip: {
        ...getBaseOption(summary).tooltip,
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: areas,
        axisLine,
        axisLabel: {
          ...axisLabel,
          formatter: value => truncateLabel(value, 18)
        }
      },
      series: statuses.map((status, index) => ({
        name: status,
        type: 'bar',
        stack: 'meter-status',
        data: areas.map(area => toNumber(lookup.get(`${area}|${status}`)?.meter_count) ?? 0),
        barMaxWidth: 18,
        itemStyle: {
          color: chartPalette[index % chartPalette.length]
        }
      }))
    }
  }
}

const createSingleMeterChart = (data) => {
  const row = data[0]
  if (!row) return null

  const summary = `电表概要查询: ${row.meter_id || '当前电表'} 有 ${formatNumber(row.data_points)} 个时序数据点。`

  return {
    title: '电表数据点概览',
    description: '把关系表中的电表信息和 TSDB 中的数据点数量放在同一视图中观察。',
    summary,
    height: 280,
    option: {
      ...getBaseOption(summary),
      tooltip: {
        ...getBaseOption(summary).tooltip,
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'value',
        axisLine,
        axisLabel,
        splitLine
      },
      yAxis: {
        type: 'category',
        data: [row.meter_id || '当前电表'],
        axisLine,
        axisLabel
      },
      series: [{
        name: '数据点',
        type: 'bar',
        data: [toNumber(row.data_points) ?? 0],
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [0, 4, 4, 0]
        }
      }]
    }
  }
}

const scenarioChartBuilders = {
  regionPowerTop10: data => createHorizontalBar(data, {
    labelKey: 'area_name',
    valueKey: 'total_energy',
    seriesName: '总用电量',
    title: '区域用电量排名',
    description: '横向排名展示各区域累计能耗，适合观察跨模型 JOIN 后的区域用电差异。',
    limit: 10
  }),
  faultyMeters: data => createCountBar(data, {
    groupKey: 'area_name',
    seriesName: '故障电表数',
    title: '故障电表区域分布',
    description: '按区域汇总故障电表数量，辅助定位关系表中故障状态集中的区域。'
  }),
  meterSummary: createSingleMeterChart,
  alertDetection: data => createCountBar(data, {
    groupKey: 'rule_name',
    seriesName: '告警条数',
    title: '告警规则命中分布',
    description: '按告警规则统计命中次数，展示规则表与时序读数联动后的异常集中点。'
  }),
  regionPowerStats: data => createBarLineChart(data, {
    xKey: 'area_name',
    barKey: 'total_energy',
    lineKey: 'avg_power',
    barName: '总用电量',
    lineName: '平均功率',
    title: '区域能耗与平均功率',
    description: '柱状展示区域总能耗，折线同步展示平均功率，便于区分规模和负荷水平。',
    sortKey: 'total_energy',
    limit: 14
  }),
  meterTrend24h: data => createLineChart(data, {
    xKey: 'ts',
    series: [
      { key: 'power', name: '功率' },
      { key: 'energy', name: '能耗', dashed: true }
    ],
    title: '24 小时功率与能耗趋势',
    description: '按时间顺序展示单块电表功率与能耗读数，体现 TSDB 连续采样能力。'
  }),
  timeBucketLoadStats: createMeterLoadChart,
  meterSessionAnalysis: data => createBarLineChart(data, {
    xKey: 'session_start',
    barKey: 'total_energy',
    lineKey: 'sample_count',
    barName: '会话能耗',
    lineName: '样本数',
    title: '用电会话能耗',
    description: '每个 session_window 形成一个会话，柱状展示会话能耗，折线展示样本数量。',
    limit: 20
  }),
  voltageStateDuration: data => createLineChart(data, {
    xKey: 'window_start',
    series: [
      { key: 'min_voltage', name: '最低电压' },
      { key: 'max_voltage', name: '最高电压', dashed: true }
    ],
    title: '电压状态窗口',
    description: '按 state_window 切分出的连续区间展示最低和最高电压。'
  }),
  currentAnomalyEvents: data => createBarLineChart(data, {
    xKey: 'event_start',
    barKey: 'peak_current',
    lineKey: 'avg_power',
    barName: '峰值电流',
    lineName: '平均功率',
    title: '异常电流事件',
    description: '每个 event_window 对应一次异常波动事件，展示峰值电流与平均功率。',
    limit: 20
  }),
  countWindowTrend: data => createLineChart(data, {
    xKey: 'window_start',
    series: [
      { key: 'avg_power', name: '平均功率' },
      { key: 'max_power', name: '峰值功率', dashed: true }
    ],
    title: '滑动窗口功率趋势',
    description: '按 count_window 形成滑动窗口，观察平均功率和峰值功率变化。'
  }),
  meterSummaryStats: createStackedStatusChart,
  userPowerRanking: data => createHorizontalBar(data, {
    labelKey: 'user_name',
    valueKey: 'total_power',
    seriesName: '总功率',
    title: '用户用电排行',
    description: '按用户汇总近 24 小时总功率，展示关系用户信息与时序读数的组合结果。',
    limit: 20
  })
}

const EChart = ({ option, height }) => {
  const chartNodeRef = React.useRef(null)
  const chartInstanceRef = React.useRef(null)

  React.useEffect(() => {
    if (!chartNodeRef.current) return undefined

    const chart = echarts.init(chartNodeRef.current, null, { renderer: 'canvas' })
    chartInstanceRef.current = chart

    const resizeObserver = window.ResizeObserver
      ? new window.ResizeObserver(() => chart.resize())
      : null

    resizeObserver?.observe(chartNodeRef.current)

    return () => {
      resizeObserver?.disconnect()
      chart.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  React.useEffect(() => {
    chartInstanceRef.current?.setOption(option, true)
  }, [option])

  return (
    <div
      ref={chartNodeRef}
      className="result-chart"
      style={{ height }}
      role="img"
      aria-label={option?.aria?.description}
    />
  )
}

const QueryResultChart = ({ scenarioKey, scenarioName, data = [] }) => {
  const chart = React.useMemo(() => {
    const builder = scenarioChartBuilders[scenarioKey]
    return builder ? builder(data) : null
  }, [scenarioKey, data])

  if (!chart) return null

  return (
    <section className="result-visualization" aria-label={`${scenarioName || chart.title} 图表分析`}>
      <div className="result-visualization-header">
        <div>
          <span className="result-chart-kicker">图表分析</span>
          <h3 className="result-chart-title">{chart.title}</h3>
          <p className="result-chart-copy">{chart.description}</p>
        </div>
      </div>
      <div className="result-chart-shell">
        <EChart
          option={chart.option}
          height={chart.height}
        />
      </div>
      <p className="result-chart-summary">{chart.summary}</p>
    </section>
  )
}

export default QueryResultChart
