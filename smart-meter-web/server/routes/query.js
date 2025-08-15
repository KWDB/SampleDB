const express = require('express');
const router = express.Router();
const queryScenarios = require('../config/scenarios');

/**
 * 获取所有查询场景列表
 */
router.get('/scenarios', (req, res) => {
  try {
    const scenarios = Object.keys(queryScenarios).map(key => ({
      key,
      name: queryScenarios[key].name,
      description: queryScenarios[key].description,
      database: queryScenarios[key].database,
      parameters: queryScenarios[key].parameters || []
    }));
    
    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取查询场景失败',
      error: error.message
    });
  }
});

/**
 * 执行指定的查询场景
 */
router.post('/execute/:scenarioKey', async (req, res) => {
  try {
    const { scenarioKey } = req.params;
    const parameters = req.body.parameters || {};
    
    if (!queryScenarios[scenarioKey]) {
      return res.status(404).json({
        success: false,
        message: `查询场景 '${scenarioKey}' 不存在`
      });
    }
    
    const startTime = Date.now();
    const result = await req.db.executeScenario(scenarioKey, parameters);
    const totalTime = Date.now() - startTime;
    
    const responseData = {
      success: true,
      data: result.data,
      meta: {
        scenario: result.scenario,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        totalTime,
        sql: result.sql,
        timestamp: new Date().toISOString()
      }
    };
    
    // 保存到查询历史
    saveToHistory({
      type: 'scenario',
      scenarioKey: scenarioKey,
      scenarioName: result.scenario?.name,
      sql: result.sql,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      database: result.scenario?.database
    });
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询执行失败',
      error: error.message
    });
  }
});

/**
 * 执行自定义SQL查询
 */
router.post('/custom', async (req, res) => {
  try {
    const { sql, database = 'rdb', parameters = [] } = req.body;
    
    if (!sql || sql.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'SQL语句不能为空'
      });
    }
    
    // 安全检查：只允许只读查询语句
    const trimmedSql = sql.trim().toLowerCase();
    const allowedStatements = ['select', 'with', 'show', 'describe', 'desc', 'explain'];
    const isAllowed = allowedStatements.some(stmt => trimmedSql.startsWith(stmt));
    
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: '只允许执行只读查询语句（SELECT、SHOW、DESCRIBE、EXPLAIN等）'
      });
    }
    
    const startTime = Date.now();
    const result = await req.db.executeQuery(database, sql, parameters);
    const totalTime = Date.now() - startTime;
    
    const responseData = {
      success: true,
      data: result.data,
      meta: {
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        totalTime,
        sql: result.sql,
        database,
        timestamp: new Date().toISOString()
      }
    };
    
    // 保存到查询历史
    saveToHistory({
      type: 'custom',
      sql: result.sql,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      database: database
    });
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '自定义查询执行失败',
      error: error.message
    });
  }
});

/**
 * 获取查询历史（简单实现，实际项目中可能需要数据库存储）
 */
let queryHistory = [];
const MAX_HISTORY = 50;

router.get('/history', (req, res) => {
  try {
    res.json({
      success: true,
      data: queryHistory.slice(-MAX_HISTORY)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取查询历史失败',
      error: error.message
    });
  }
});

/**
 * 保存查询到历史记录
 */
function saveToHistory(queryInfo) {
  queryHistory.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...queryInfo
  });
  
  // 保持历史记录数量限制
  if (queryHistory.length > MAX_HISTORY) {
    queryHistory = queryHistory.slice(-MAX_HISTORY);
  }
}



/**
 * 获取电表列表（用于参数选择）
 */
router.get('/meters', async (req, res) => {
  try {
    const result = await req.db.executeQuery('rdb', `
      SELECT 
        mi.meter_id,
        mi.manufacturer,
        mi.status,
        ui.user_name,
        ai.area_name
      FROM rdb.meter_info mi
      JOIN rdb.user_info ui ON mi.user_id = ui.user_id
      JOIN rdb.area_info ai ON mi.area_id = ai.area_id
      ORDER BY mi.meter_id
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取电表列表失败',
      error: error.message
    });
  }
});

/**
 * 获取区域列表
 */
router.get('/areas', async (req, res) => {
  try {
    const result = await req.db.executeQuery('rdb', `
      SELECT area_id, area_name, manager, region
      FROM rdb.area_info
      ORDER BY area_name
    `);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取区域列表失败',
      error: error.message
    });
  }
});

module.exports = router;