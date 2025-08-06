#!/usr/bin/env ts-node

/**
 * 查看监控状态脚本
 * 功能：读取缓存文件并显示当前监控状态和统计信息
 */

import fs from 'fs/promises'
import path from 'path'

// Next.js 会自动加载环境变量文件
// 无需手动加载

// 从环境变量获取配置
const CACHE_DIR = process.env.MONITOR_CACHE_DIR || './cache'
const CACHE_FILE = path.join(CACHE_DIR, 'trading-events.json')
const LOG_FILE = path.join(CACHE_DIR, 'monitor.log')

interface TradeEventData {
  signature: string
  blockTime: number
  slot: number
  id: string
  userId: string
  fundId: string
  tradeType: any
  amount: string // JSON中存储为字符串
  price: string
  timestamp: string
  parsedAt: number
}

interface CacheData {
  lastUpdate: number
  lastSignature?: string
  events: TradeEventData[]
  totalEvents: number
  monitorStartTime: number
}

async function displayMonitorStatus() {
  console.log('📊 SL Trading 监控器状态报告')
  console.log('='.repeat(50))

  try {
    // 检查缓存文件是否存在
    const cacheExists = await fs.access(CACHE_FILE).then(() => true).catch(() => false)
    
    if (!cacheExists) {
      console.log('❌ 缓存文件不存在，监控器可能还未启动')
      console.log(`📁 期望的缓存文件位置: ${path.resolve(CACHE_FILE)}`)
      return
    }

    // 读取缓存数据
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    const cache: CacheData = JSON.parse(data, (key, value) => {
      // 恢复 BigInt 类型
      if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1))
      }
      return value
    })

    // 显示基本信息
    console.log(`🎯 监控开始时间: ${new Date(cache.monitorStartTime).toLocaleString('zh-CN')}`)
    console.log(`🔄 最后更新时间: ${cache.lastUpdate ? new Date(cache.lastUpdate).toLocaleString('zh-CN') : '从未'}`)
    console.log(`📊 总交易事件数: ${cache.totalEvents}`)
    console.log(`💾 缓存事件数: ${cache.events.length}`)
    console.log(`🔗 最后签名: ${cache.lastSignature || '无'}`)

    // 运行时间统计
    const runTime = cache.lastUpdate ? cache.lastUpdate - cache.monitorStartTime : Date.now() - cache.monitorStartTime
    const runTimeHours = Math.floor(runTime / (1000 * 60 * 60))
    const runTimeMinutes = Math.floor((runTime % (1000 * 60 * 60)) / (1000 * 60))
    console.log(`⏱️ 总运行时间: ${runTimeHours}小时 ${runTimeMinutes}分钟`)

    if (cache.events.length > 0) {
      console.log('\n📈 最近事件统计:')
      
      // 按类型统计
      const buyCount = cache.events.filter(e => e.tradeType === 0 || e.tradeType?.BUY !== undefined).length
      const sellCount = cache.events.filter(e => e.tradeType === 1 || e.tradeType?.SELL !== undefined).length
      console.log(`  💰 买入事件: ${buyCount}`)
      console.log(`  💸 卖出事件: ${sellCount}`)

      // 最近5个事件
      console.log('\n🕐 最近5个事件:')
      const recentEvents = cache.events.slice(0, 5)
      recentEvents.forEach((event, index) => {
        const type = (event.tradeType === 0 || event.tradeType?.BUY !== undefined) ? '买入' : '卖出'
        const time = new Date(Number(event.timestamp) * 1000).toLocaleString('zh-CN')
        console.log(`  ${index + 1}. [${type}] ${event.id} - ${time}`)
      })

      // 用户和基金统计
      const uniqueUsers = new Set(cache.events.map(e => e.userId).filter(id => id !== 'unknown')).size
      const uniqueFunds = new Set(cache.events.map(e => e.fundId).filter(id => id !== 'unknown')).size
      console.log(`\n👥 唯一用户数: ${uniqueUsers}`)
      console.log(`🏦 唯一基金数: ${uniqueFunds}`)
    }

    // 读取日志文件的最后几行
    const logExists = await fs.access(LOG_FILE).then(() => true).catch(() => false)
    if (logExists) {
      console.log('\n📝 最近日志:')
      const logData = await fs.readFile(LOG_FILE, 'utf-8')
      const logLines = logData.trim().split('\n').slice(-5)
      logLines.forEach(line => {
        console.log(`  ${line}`)
      })
    }

  } catch (error) {
    console.error('❌ 读取状态失败:', error)
  }
}

async function displayHelp() {
  console.log(`
🚀 SL Trading 监控器管理命令

📋 可用命令:
  npm run monitor        - 启动监控器
  npm run monitor:dev    - 开发模式启动（文件变化时重启）
  npm run monitor:status - 查看监控状态

📁 文件位置:
  配置文件: scripts/trading-monitor.ts
  环境配置: .env (Next.js 自动加载)
  缓存文件: ${path.resolve(CACHE_FILE)}
  日志文件: ${path.resolve(LOG_FILE)}

⚙️ 当前配置:
  程序地址: ${process.env.MONITOR_PROGRAM_ADDRESS || 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi'}
  RPC节点: ${process.env.MONITOR_RPC_URL || 'https://api.devnet.solana.com'}
  监控间隔: ${process.env.MONITOR_INTERVAL_SECONDS || '60'}秒
  批次大小: ${process.env.MONITOR_BATCH_SIZE || '50'}个交易
  并发限制: ${process.env.MONITOR_CONCURRENCY_LIMIT || '5'}
  最大缓存: ${process.env.MONITOR_MAX_CACHE_EVENTS || '1000'}个事件

🔧 配置修改:
  编辑 .env 文件以修改配置参数
  或设置相应的环境变量来覆盖配置
  
📝 Next.js 环境变量文件优先级:
  .env.local (优先级最高，Git 忽略)
  .env.development / .env.production
  .env (默认配置)
`)
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    await displayHelp()
  } else {
    await displayMonitorStatus()
  }
}

// 直接运行主函数
main().catch(console.error) 