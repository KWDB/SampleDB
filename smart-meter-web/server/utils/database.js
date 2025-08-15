const { Pool } = require('pg');
const queryScenarios = require('../config/scenarios');

class KWDBConnection {
  constructor() {
    // 数据库配置
    this.config = {
      host: process.env.KWDB_HOST || 'localhost',
      port: process.env.KWDB_PORT || 26257,
      user: process.env.KWDB_USER || 'root',
      password: process.env.KWDB_PASSWORD || '',
      ssl: process.env.KWDB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20, // 连接池最大连接数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // 创建连接池
    this.rdbPool = new Pool({
      ...this.config,
      database: 'rdb'
    });
    
    this.tsdbPool = new Pool({
      ...this.config,
      database: 'tsdb'
    });
    
    this.defaultdbPool = new Pool({
      ...this.config,
      database: 'defaultdb'
    });

    // 监听连接池事件
    this.setupPoolEvents();
  }

  setupPoolEvents() {
    const pools = {
      'rdb': this.rdbPool,
      'tsdb': this.tsdbPool,
      'defaultdb': this.defaultdbPool
    };

    Object.entries(pools).forEach(([name, pool]) => {
      pool.on('connect', () => {
        console.log(`✅ ${name} 数据库连接已建立`);
      });

      pool.on('error', (err) => {
        console.error(`❌ ${name} 数据库连接错误:`, err);
      });

      pool.on('remove', () => {
        console.log(`🔄 ${name} 数据库连接已移除`);
      });
    });
  }

  /**
   * 测试数据库连接
   */
  async testConnection() {
    const results = {};
    
    try {
      // 测试RDB连接
      const rdbClient = await this.rdbPool.connect();
      const rdbStart = Date.now();
      await rdbClient.query('SELECT 1');
      const rdbLatency = Date.now() - rdbStart;
      rdbClient.release();
      
      results.rdb = {
        status: 'connected',
        latency: rdbLatency
      };
    } catch (error) {
      results.rdb = {
        status: 'error',
        error: error.message
      };
    }

    try {
      // 测试TSDB连接
      const tsdbClient = await this.tsdbPool.connect();
      const tsdbStart = Date.now();
      await tsdbClient.query('SELECT 1');
      const tsdbLatency = Date.now() - tsdbStart;
      tsdbClient.release();
      
      results.tsdb = {
        status: 'connected',
        latency: tsdbLatency
      };
    } catch (error) {
      results.tsdb = {
        status: 'error',
        error: error.message
      };
    }

    const connected = results.rdb.status === 'connected' && results.tsdb.status === 'connected';
    
    return {
      success: connected,
      connected,
      rdbStatus: results.rdb.status,
      tsdbStatus: results.tsdb.status,
      latency: {
        rdb: results.rdb.latency,
        tsdb: results.tsdb.latency
      },
      message: connected ? 'KWDB连接成功' : '部分数据库连接失败'
    };
  }

  /**
   * 执行SQL查询
   * @param {string} database - 数据库名称 ('rdb', 'tsdb')
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   */
  async executeQuery(database, sql, params = []) {
    let pool;
    
    // 选择连接池
    switch (database) {
      case 'rdb':
        pool = this.rdbPool;
        break;
      case 'tsdb':
        pool = this.tsdbPool;
        break;
      case 'mixed':
      case 'defaultdb':
        pool = this.defaultdbPool;
        break;
      default:
        throw new Error(`不支持的数据库: ${database}`);
    }

    const client = await pool.connect();
    
    try {
      const start = Date.now();
      const result = await client.query(sql, params);
      const executionTime = Date.now() - start;
      
      return {
        data: result.rows,
        rowCount: result.rowCount,
        executionTime,
        sql: sql.trim()
      };
    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * 执行预定义查询场景
   * @param {string} scenarioKey - 查询场景键名
   * @param {Object} parameters - 查询参数
   */
  async executeScenario(scenarioKey, parameters = {}) {
    const scenario = queryScenarios[scenarioKey];
    
    if (!scenario) {
      throw new Error(`未找到查询场景: ${scenarioKey}`);
    }

    // 处理参数化查询
    let sql = scenario.sql;
    const params = [];
    
    if (scenario.parameters && scenario.parameters.length > 0) {
      scenario.parameters.forEach((paramName) => {
        if (parameters[paramName] !== undefined) {
          params.push(parameters[paramName]);
        } else {
          throw new Error(`缺少必需参数: ${paramName}`);
        }
      });
    }

    const result = await this.executeQuery(scenario.database, sql, params);
    
    return {
      ...result,
      scenario: {
        key: scenarioKey,
        name: scenario.name,
        description: scenario.description,
        database: scenario.database
      }
    };
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats() {
    try {
      // 获取RDB表行数
      const rdbCounts = await this.executeQuery('rdb', `
        SELECT 
          'meter_info' as table_name, COUNT(*) as row_count FROM rdb.meter_info
        UNION ALL
        SELECT 
          'user_info' as table_name, COUNT(*) as row_count FROM rdb.user_info
        UNION ALL
        SELECT 
          'area_info' as table_name, COUNT(*) as row_count FROM rdb.area_info
        UNION ALL
        SELECT 
          'alarm_rules' as table_name, COUNT(*) as row_count FROM rdb.alarm_rules
      `);

      // 获取TSDB表行数和时间范围
      const tsdbCounts = await this.executeQuery('tsdb', `
        SELECT 
          'meter_data' as table_name, 
          COUNT(*) as row_count,
          MIN(ts) as earliest_data,
          MAX(ts) as latest_data
        FROM tsdb.meter_data
      `);

      // 获取表结构信息
      const rdbTables = await this.executeQuery('rdb', `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tsdbTables = await this.executeQuery('tsdb', `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      return {
        rdb: {
          tables: rdbTables.data,
          counts: rdbCounts.data
        },
        tsdb: {
          tables: tsdbTables.data,
          counts: tsdbCounts.data
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`获取数据库统计失败: ${error.message}`);
    }
  }

  /**
   * 关闭所有连接池
   */
  async close() {
    try {
      await Promise.all([
        this.rdbPool.end(),
        this.tsdbPool.end(),
        this.defaultdbPool.end()
      ]);
      console.log('🔒 所有数据库连接池已关闭');
    } catch (error) {
      console.error('关闭连接池时出错:', error);
    }
  }
}

module.exports = { KWDBConnection };