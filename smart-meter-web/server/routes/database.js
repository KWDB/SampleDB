const express = require('express');
const router = express.Router();

// 辅助函数：获取单个数据库的schema
async function getSchemaForDatabase(db, database) {
  try {
    console.log(`🔍 开始查询 ${database} 数据库的表信息...`);
    // 获取表信息 - 查询 information_schema，使用 public schema
    const tablesResult = await db.executeQuery(database, `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `, []);
    console.log(`📋 ${database} 数据库找到 ${tablesResult.data.length} 个表`);
    
    // 获取每个表的列信息并构建表数组
    const tables = [];
    
    for (const table of tablesResult.data) {
      const tableName = table.table_name;
      const tableType = table.table_type || 'BASE TABLE';
      
      try {
        const columnsResult = await db.executeQuery(database, `
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `, []);
        
        const columns = columnsResult.data.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }));
        
        tables.push({
          table_name: tableName,
          table_type: tableType,
          database: database,
          columns: columns,
          column_count: columns.length
        });
      } catch (error) {
        console.warn(`⚠️ 获取表 ${tableName} 的列信息失败:`, error.message);
        // 如果获取列信息失败，仍然添加表信息但不包含列详情
        tables.push({
          table_name: tableName,
          table_type: tableType,
          database: database,
          columns: [],
          column_count: 0
        });
      }
    }
    
    console.log(`✅ ${database} 数据库schema处理完成，返回 ${tables.length} 个表`);
    return tables;
  } catch (error) {
    console.error(`❌ 获取${database}数据库schema失败:`, error);
    throw new Error(`获取${database}数据库schema失败: ${error.message}`);
  }
}

/**
 * 获取数据库连接状态
 */
router.get('/status', async (req, res) => {
  try {
    const status = await req.db.testConnection();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取数据库状态失败',
      error: error.message
    });
  }
});

/**
 * 获取数据库配置信息（不包含敏感信息）
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      host: process.env.KWDB_HOST || 'localhost',
      port: process.env.KWDB_PORT || 26257,
      user: process.env.KWDB_USER || 'root',
      ssl: process.env.KWDB_SSL === 'true',
      databases: ['rdb', 'tsdb', 'defaultdb']
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取数据库配置失败',
      error: error.message
    });
  }
});

/**
 * 测试数据库连接
 */
router.post('/test', async (req, res) => {
  try {
    const testResult = await req.db.testConnection();
    
    res.json({
      success: true,
      data: testResult,
      message: testResult.connected ? '数据库连接测试成功' : '数据库连接测试失败'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '数据库连接测试失败',
      error: error.message
    });
  }
});

/**
 * 获取数据库统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await req.db.getDatabaseStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取数据库统计失败',
      error: error.message
    });
  }
});

/**
 * 获取表结构信息
 */
router.get('/schema/:database', async (req, res) => {
  try {
    const { database } = req.params;
    console.log(`📊 获取数据库schema请求: ${database}`);
    
    // 支持mixed参数，返回两个数据库的schema
    if (database === 'mixed') {
      console.log('🔄 开始获取 rdb schema...');
      const rdbSchema = await getSchemaForDatabase(req.db, 'rdb');
      console.log(`✅ rdb schema 获取成功，表数量: ${rdbSchema.length}`);
      
      console.log('🔄 开始获取 tsdb schema...');
      const tsdbSchema = await getSchemaForDatabase(req.db, 'tsdb');
      console.log(`✅ tsdb schema 获取成功，表数量: ${tsdbSchema.length}`);
      
      // 合并两个数据库的表数据
      const combinedSchema = [...rdbSchema, ...tsdbSchema];
      console.log(`✅ 合并后总表数量: ${combinedSchema.length}`);
      
      return res.json({
        success: true,
        data: combinedSchema
      });
    }
    
    if (!['rdb', 'tsdb'].includes(database)) {
      return res.status(400).json({
        success: false,
        message: '无效的数据库名称，只支持 rdb、tsdb 或 mixed'
      });
    }
    
    const schemaData = await getSchemaForDatabase(req.db, database);
    
    res.json({
      success: true,
      data: schemaData
    });
  } catch (error) {
    console.error(`❌ 获取表结构失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取表结构失败',
      error: error.message
    });
  }
});

/**
 * 检查数据导入状态
 */
router.get('/import-status', async (req, res) => {
  try {
    // 检查各表的数据量
    const rdbCounts = await req.db.executeQuery('rdb', `
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
    
    const tsdbCounts = await req.db.executeQuery('tsdb', `
      SELECT 
        'meter_data' as table_name, 
        COUNT(*) as row_count,
        MIN(ts) as earliest_data,
        MAX(ts) as latest_data
      FROM tsdb.meter_data
    `);
    
    // 检查数据完整性
    const integrityCheck = await req.db.executeQuery('rdb', `
      SELECT 
        'orphaned_meters' as check_type,
        COUNT(*) as count
      FROM tsdb.meter_data md
      LEFT JOIN rdb.meter_info mi ON md.meter_id = mi.meter_id
      WHERE mi.meter_id IS NULL
      
      UNION ALL
      
      SELECT 
        'meters_without_data' as check_type,
        COUNT(*) as count
      FROM rdb.meter_info mi
      LEFT JOIN tsdb.meter_data md ON mi.meter_id = md.meter_id
      WHERE md.meter_id IS NULL
    `);
    
    const status = {
      rdb: rdbCounts.data,
      tsdb: tsdbCounts.data,
      integrity: integrityCheck.data,
      timestamp: new Date().toISOString()
    };
    
    // 判断导入状态
    const hasRdbData = rdbCounts.data.every(table => table.row_count > 0);
    const hasTsdbData = tsdbCounts.data[0]?.row_count > 0;
    const isComplete = hasRdbData && hasTsdbData;
    
    res.json({
      success: true,
      data: {
        ...status,
        importComplete: isComplete,
        hasRdbData,
        hasTsdbData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '检查数据导入状态失败',
      error: error.message
    });
  }
});

/**
 * 获取数据库版本和系统信息
 */
router.get('/info', async (req, res) => {
  try {
    // 获取版本信息
    const versionResult = await req.db.executeQuery('rdb', 'SELECT version()');
    
    // 获取基本数据库信息
    const rdbInfo = await req.db.executeQuery('rdb', `
      SELECT 
        'rdb' as database_name,
        COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'rdb'
    `);
    
    const tsdbInfo = await req.db.executeQuery('tsdb', `
      SELECT 
        'tsdb' as database_name,
        COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'tsdb'
    `);
    
    // 获取连接状态
    const connectionStatus = await req.db.testConnection();
    
    res.json({
      success: true,
      data: {
        version: versionResult.data[0]?.version || 'Unknown',
        databases: [
          ...rdbInfo.data,
          ...tsdbInfo.data
        ],
        connections: {
          rdb: connectionStatus.rdbStatus,
          tsdb: connectionStatus.tsdbStatus,
          latency: connectionStatus.latency
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取数据库信息失败',
      error: error.message
    });
  }
});

/**
 * 生成测试数据
 */
router.post('/generate-data', async (req, res) => {
  try {
    const { count = 10000 } = req.body;
    
    // 验证参数
    if (!count || count < 1 || count > 100000) {
      return res.status(400).json({
        success: false,
        message: '数据条数必须在1-100000之间'
      });
    }

    // 生成测试数据的SQL语句
    const sql = `
      INSERT INTO tsdb.meter_data(ts, voltage, current, power, energy, meter_id)
      SELECT 
        NOW()-(s*10)::int * INTERVAL '1 minute',
        220.0 + (s%10)::float,
        5.0 + (s%15)::float * 0.1,
        1000.0 + (s%20)::float * 50,
        5000.0 + s::float * 10,
        'M' || ((s%100)+1)::text
      FROM generate_series(1, ${count}) AS s;
    `;

    // 执行SQL语句
    const result = await req.db.executeQuery('tsdb', sql);
    
    res.json({
      success: true,
      message: `成功生成 ${count} 条测试数据`,
      data: {
        count: count,
        affected_rows: result.rowCount || count
      }
    });
  } catch (error) {
    console.error('生成测试数据失败:', error);
    res.status(500).json({
      success: false,
      message: '生成测试数据失败',
      error: error.message
    });
  }
});

/**
 * 获取表数据
 */
router.get('/table-data/:database/:tableName', async (req, res) => {
  try {
    const { database, tableName } = req.params;
    const { page = 1, pageSize = 50 } = req.query;
    
    console.log(`🔍 获取表数据请求: ${database}.${tableName}, page=${page}, pageSize=${pageSize}`);
    
    // 验证数据库名称
    if (!['rdb', 'tsdb'].includes(database)) {
      console.log(`❌ 不支持的数据库类型: ${database}`);
      return res.status(400).json({
        success: false,
        message: '不支持的数据库类型'
      });
    }
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询SQL
    const sql = `SELECT * FROM ${database}.${tableName} LIMIT ${pageSize} OFFSET ${offset}`;
    console.log(`📝 执行查询SQL: ${sql}`);
    
    // 执行查询
    const result = await req.db.executeQuery(database, sql);
    console.log(`📊 查询结果记录数: ${result.data?.length || 0}`);
    
    // 获取总行数
    const countSql = `SELECT COUNT(*) as total FROM ${database}.${tableName}`;
    console.log(`📝 执行计数SQL: ${countSql}`);
    const countResult = await req.db.executeQuery(database, countSql);
    const total = countResult.data[0]?.total || 0;
    console.log(`📈 总记录数: ${total}`);
    
    res.json({
      success: true,
      data: {
        records: result.data,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(pageSize),
          total: parseInt(total)
        }
      }
    });
  } catch (error) {
    console.error('获取表数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取表数据失败',
      error: error.message
    });
  }
});

module.exports = router;