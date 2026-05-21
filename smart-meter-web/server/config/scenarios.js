/**
 * 智能电表查询场景配置
 * 基于 scenario.md 文件中的查询示例
 */

const queryScenarios = {
  // 1. 区域用电量TOP10
  regionPowerTop10: {
    name: '区域用电量TOP10',
    description: '查询各区域的总用电量，按用电量降序排列，显示前10名',
    database: 'mixed',
    sql: `
      SELECT 
        a.area_name,
        SUM(md.energy) AS total_energy
      FROM tsdb.meter_data md
      JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
      JOIN rdb.area_info a ON mi.area_id = a.area_id
      GROUP BY a.area_name
      ORDER BY total_energy DESC
      LIMIT 10
    `,
    parameters: []
  },

  // 2. 故障电表及用户信息查询
  faultyMeters: {
    name: '故障电表查询',
    description: '查询状态为故障的电表及其对应的用户信息',
    database: 'rdb',
    sql: `
      SELECT 
        mi.meter_id,
        u.user_name,
        u.contact,
        a.area_name
      FROM meter_info mi
      JOIN user_info u ON mi.user_id = u.user_id
      JOIN area_info a ON mi.area_id = a.area_id
      WHERE mi.status = 'Fault'
    `,
    parameters: []
  },

  // 3. 电表概要查询
  meterSummary: {
    name: '电表概要查询',
    description: '查询指定电表的详细信息和数据点统计',
    database: 'mixed',
    sql: `
      SELECT 
        mi.meter_id,
        mi.voltage_level,
        mi.status,
        u.user_name,
        a.area_name,
        (SELECT COUNT(*) 
         FROM tsdb.meter_data md 
         WHERE md.meter_id = mi.meter_id) AS data_points
      FROM rdb.meter_info mi
      JOIN rdb.user_info u ON mi.user_id = u.user_id
      JOIN rdb.area_info a ON mi.area_id = a.area_id
      WHERE mi.meter_id = $1
    `,
    parameters: ['meter_id']
  },

  // 4. 告警检测查询
  alertDetection: {
    name: '告警检测',
    description: '根据告警规则检测异常电表数据',
    database: 'mixed',
    sql: `
      SELECT 
        md.meter_id,
        md.ts,
        ar.rule_name,
        md.voltage,
        md.current,
        md.power
      FROM tsdb.meter_data md
      JOIN rdb.alarm_rules ar ON 1=1
      WHERE (ar.metric = 'voltage' 
             AND ((ar.operator = '>' AND md.voltage < ar.threshold) 
                  OR (ar.operator = '<' AND md.voltage > ar.threshold)))
         OR (ar.metric = 'current' AND md.current > ar.threshold)
         OR (ar.metric = 'power' AND md.power > ar.threshold)
      ORDER BY md.ts DESC
      LIMIT 100
    `,
    parameters: []
  },

  // 5. 区域用电量统计
  regionPowerStats: {
    name: '区域用电量统计',
    description: '统计各区域的详细用电情况，包括区域、区域名称、总用电量和平均功率',
    database: 'mixed',
    sql: `
      SELECT 
        a.region,
        a.area_name,
        SUM(md.energy) AS total_energy,
        AVG(md.power) AS avg_power
      FROM tsdb.meter_data md
      JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
      JOIN rdb.area_info a ON mi.area_id = a.area_id
      GROUP BY a.region, a.area_name
    `,
    parameters: []
  },

  // 6. 电表24小时用电趋势
  meterTrend24h: {
    name: '电表24小时用电趋势',
    description: '查询指定电表最近24小时的用电趋势数据',
    database: 'tsdb',
    sql: `
      SELECT 
        md.ts,
        md.power,
        md.energy
      FROM tsdb.meter_data md
      WHERE md.meter_id = $1
        AND md.ts > NOW() - INTERVAL '24 hours'
      ORDER BY md.ts
    `,
    parameters: ['meter_id']
  },

  // 7. 分时负荷统计
  timeBucketLoadStats: {
    name: '分时负荷统计',
    description: '按1小时粒度统计重点电表的平均功率、峰值功率与样本数',
    database: 'tsdb',
    sql: `
      SELECT
        meter_id,
        time_bucket(ts, '1h') AS bucket_start,
        COUNT(*) AS sample_count,
        AVG(power) AS avg_power,
        MAX(power) AS max_power
      FROM tsdb.meter_data
      WHERE meter_id IN ('M1', 'M2', 'M3')
      GROUP BY meter_id, bucket_start
      ORDER BY meter_id, bucket_start
    `,
    parameters: []
  },

  // 8. 用电会话分析
  meterSessionAnalysis: {
    name: '用电会话分析',
    description: '以30分钟空闲间隔划分会话窗口，查看单个电表每个会话的起止时间和累计能耗',
    database: 'tsdb',
    sql: `
      SELECT
        meter_id,
        first(ts) AS session_start,
        last(ts) AS session_end,
        COUNT(*) AS sample_count,
        SUM(energy) AS total_energy
      FROM tsdb.meter_data
      WHERE meter_id = $1
      GROUP BY meter_id, session_window(ts, '30m')
      ORDER BY session_start
    `,
    parameters: ['meter_id']
  },

  // 9. 电压状态持续分析
  voltageStateDuration: {
    name: '电压状态持续分析',
    description: '按电压状态变化切分连续区间，分析指定电表高压或低压状态的持续情况',
    database: 'tsdb',
    sql: `
      SELECT
        meter_id,
        first(ts) AS window_start,
        last(ts) AS window_end,
        COUNT(*) AS sample_count,
        MIN(voltage) AS min_voltage,
        MAX(voltage) AS max_voltage
      FROM tsdb.meter_data
      WHERE meter_id = $1
      GROUP BY
        meter_id,
        state_window(CASE WHEN voltage >= 225 THEN 'high' ELSE 'low' END)
      ORDER BY window_start
    `,
    parameters: ['meter_id']
  },

  // 10. 异常电流事件识别
  currentAnomalyEvents: {
    name: '异常电流事件识别',
    description: '以电流升高和回落条件识别完整异常波动事件，统计峰值电流和平均功率',
    database: 'tsdb',
    sql: `
      SELECT
        meter_id,
        first(ts) AS event_start,
        last(ts) AS event_end,
        COUNT(*) AS sample_count,
        MAX(current) AS peak_current,
        AVG(power) AS avg_power
      FROM tsdb.meter_data
      WHERE meter_id = $1
      GROUP BY meter_id, event_window(current >= 6, current <= 5.3)
      ORDER BY event_start
    `,
    parameters: ['meter_id']
  },

  // 11. 滑动采样趋势分析
  countWindowTrend: {
    name: '滑动采样趋势分析',
    description: '每12条采样组成一个窗口并以6条为步长滑动，观察指定电表功率变化趋势',
    database: 'tsdb',
    sql: `
      SELECT
        meter_id,
        first(ts) AS window_start,
        last(ts) AS window_end,
        COUNT(*) AS sample_count,
        AVG(power) AS avg_power,
        MAX(power) AS max_power
      FROM tsdb.meter_data
      WHERE meter_id = $1
      GROUP BY meter_id, count_window(12, 6)
      ORDER BY window_start
    `,
    parameters: ['meter_id']
  },


  // 12. 电表概要统计
  meterSummaryStats: {
    name: '电表概要统计',
    description: '按区域和状态统计电表数量分布',
    database: 'rdb',
    sql: `
      SELECT 
        a.area_name,
        mi.status,
        COUNT(*) as meter_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM meter_info mi
      JOIN area_info a ON mi.area_id = a.area_id
      GROUP BY a.area_id, a.area_name, mi.status
      ORDER BY a.area_name, mi.status
    `,
    parameters: []
  },

  // 13. 用户用电排行
  userPowerRanking: {
    name: '用户用电排行',
    description: '查询用户用电量排行榜',
    database: 'mixed',
    sql: `
      SELECT 
        ui.user_name,
        ui.contact,
        ai.area_name,
        mi.meter_id,
        ROUND(SUM(md.power), 2) as total_power,
        ROUND(AVG(md.power), 2) as avg_power,
        COUNT(*) as data_points
      FROM tsdb.meter_data md
      JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
      JOIN rdb.user_info ui ON mi.user_id = ui.user_id
      JOIN rdb.area_info ai ON mi.area_id = ai.area_id
      WHERE md.ts >= NOW() - INTERVAL '24 hours'
      GROUP BY ui.user_id, ui.user_name, ui.contact, ai.area_name, mi.meter_id
      ORDER BY total_power DESC
      LIMIT 20
    `,
    parameters: []
  }
};

module.exports = queryScenarios;
