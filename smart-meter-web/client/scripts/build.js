#!/usr/bin/env node
/* eslint-disable no-undef */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 构建模式配置
const BUILD_MODES = {
  development: {
    NODE_ENV: 'development',
    sourcemap: true,
    minify: false
  },
  production: {
    NODE_ENV: 'production',
    sourcemap: false,
    minify: true
  },
  analyze: {
    NODE_ENV: 'production',
    ANALYZE: true,
    sourcemap: false,
    minify: true
  },
  pwa: {
    NODE_ENV: 'production',
    PWA: true,
    sourcemap: false,
    minify: true
  }
}

// 获取命令行参数
const args = process.argv.slice(2)
const mode = args[0] || 'production'
const config = BUILD_MODES[mode]

if (!config) {
  console.error(`❌ 未知的构建模式: ${mode}`)
  console.log('可用的构建模式:')
  Object.keys(BUILD_MODES).forEach(key => {
    console.log(`  - ${key}`)
  })
  process.exit(1)
}

console.log(`🚀 开始构建 (模式: ${mode})`)
console.log('构建配置:', config)

// 设置环境变量
Object.entries(config).forEach(([key, value]) => {
  process.env[key] = value
})

// 清理dist目录
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  console.log('🧹 清理构建目录...')
  fs.rmSync(distPath, { recursive: true, force: true })
}

try {
  // 执行构建
  console.log('📦 开始打包...')
  const startTime = Date.now()
  
  execSync('npm run build', {
    stdio: 'inherit',
    env: { ...process.env }
  })
  
  const buildTime = Date.now() - startTime
  console.log(`✅ 构建完成! 耗时: ${(buildTime / 1000).toFixed(2)}s`)
  
  // 分析构建结果
  if (fs.existsSync(distPath)) {
    analyzeBuildResult(distPath)
  }
  
  // 如果是分析模式，打开分析报告
  if (mode === 'analyze') {
    const statsPath = path.join(distPath, 'stats.html')
    if (fs.existsSync(statsPath)) {
      console.log('📊 打包分析报告已生成:', statsPath)
    }
  }
  
} catch (error) {
  console.error('❌ 构建失败:', error.message)
  process.exit(1)
}

// 分析构建结果
function analyzeBuildResult(distPath) {
  console.log('\n📊 构建结果分析:')
  
  const files = getAllFiles(distPath)
  const stats = {
    total: 0,
    js: 0,
    css: 0,
    images: 0,
    fonts: 0,
    other: 0
  }
  
  files.forEach(file => {
    const size = fs.statSync(file).size
    stats.total += size
    
    const ext = path.extname(file).toLowerCase()
    if (['.js', '.mjs'].includes(ext)) {
      stats.js += size
    } else if (ext === '.css') {
      stats.css += size
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
      stats.images += size
    } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      stats.fonts += size
    } else {
      stats.other += size
    }
  })
  
  console.log(`总大小: ${formatSize(stats.total)}`)
  console.log(`JavaScript: ${formatSize(stats.js)} (${((stats.js / stats.total) * 100).toFixed(1)}%)`)
  console.log(`CSS: ${formatSize(stats.css)} (${((stats.css / stats.total) * 100).toFixed(1)}%)`)
  console.log(`图片: ${formatSize(stats.images)} (${((stats.images / stats.total) * 100).toFixed(1)}%)`)
  console.log(`字体: ${formatSize(stats.fonts)} (${((stats.fonts / stats.total) * 100).toFixed(1)}%)`)
  console.log(`其他: ${formatSize(stats.other)} (${((stats.other / stats.total) * 100).toFixed(1)}%)`)
  
  // 检查大文件
  const largeFiles = files
    .map(file => ({
      path: path.relative(distPath, file),
      size: fs.statSync(file).size
    }))
    .filter(file => file.size > 500 * 1024) // 大于500KB
    .sort((a, b) => b.size - a.size)
  
  if (largeFiles.length > 0) {
    console.log('\n⚠️  大文件警告 (>500KB):')
    largeFiles.forEach(file => {
      console.log(`  ${file.path}: ${formatSize(file.size)}`)
    })
  }
  
  // 性能建议
  console.log('\n💡 性能建议:')
  if (stats.js > 1024 * 1024) {
    console.log('  - JavaScript文件较大，考虑进一步代码分割')
  }
  if (stats.images > 2 * 1024 * 1024) {
    console.log('  - 图片文件较大，考虑压缩或使用WebP格式')
  }
  if (stats.total > 5 * 1024 * 1024) {
    console.log('  - 总体积较大，考虑启用CDN或懒加载')
  }
}

// 获取目录下所有文件
function getAllFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        traverse(fullPath)
      } else {
        files.push(fullPath)
      }
    })
  }
  
  traverse(dir)
  return files
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}