#!/usr/bin/env ts-node

/**
 * SL Trading 交易数据监控脚本
 * 功能：每分钟自动读取 SL Trading 程序的交易事件并缓存到文件
 */

import fs from 'fs/promises'
import path from 'path'
// 动态导入生成的模块
let SL_TRADING_PROGRAM_ADDRESS: string
let getTradeEventDecoder: any
let TradeType: any

async function loadGeneratedModules() {
  const generatedModule = await import('../src/generated/index')
  
  SL_TRADING_PROGRAM_ADDRESS = generatedModule.SL_TRADING_PROGRAM_ADDRESS
  getTradeEventDecoder = generatedModule.getTradeEventDecoder
  TradeType = generatedModule.TradeType
  
  // 初始化配置
  CONFIG = {
    // 程序地址
    PROGRAM_ADDRESS: process.env.MONITOR_PROGRAM_ADDRESS || SL_TRADING_PROGRAM_ADDRESS,
    
    // RPC 连接地址
    RPC_URL: process.env.MONITOR_RPC_URL || 'https://api.devnet.solana.com',
    
    // 缓存文件路径
    CACHE_DIR: process.env.MONITOR_CACHE_DIR || './cache',
    
    // 监控间隔 (毫秒)
    MONITOR_INTERVAL: (parseInt(process.env.MONITOR_INTERVAL_SECONDS || '60')) * 1000,
    
    // 每次获取的交易数量限制
    BATCH_SIZE: parseInt(process.env.MONITOR_BATCH_SIZE || '50'),
    
    // 并发限制
    CONCURRENCY_LIMIT: parseInt(process.env.MONITOR_CONCURRENCY_LIMIT || '5'),
    
    // 最大缓存事件数量
    MAX_CACHE_EVENTS: parseInt(process.env.MONITOR_MAX_CACHE_EVENTS || '1000'),
    
    // 日志级别
    LOG_LEVEL: process.env.MONITOR_LOG_LEVEL || 'info',
  }
  
  // 构建文件路径
  CONFIG.CACHE_FILE = path.join(CONFIG.CACHE_DIR, 'trading-events.json')
  CONFIG.LOG_FILE = path.join(CONFIG.CACHE_DIR, 'monitor.log')
}

// 导入 Solana 相关类型和方法
import { Connection, PublicKey } from '@solana/web3.js'

// Next.js 会自动加载 .env.local, .env 等文件
// 无需手动加载环境变量

// 配置将在模块加载后创建
let CONFIG: any

// 交易事件数据类型
interface TradeEventData {
  signature: string
  blockTime: number
  slot: number
  id: string
  userId: string
  fundId: string
  tradeType: typeof TradeType[keyof typeof TradeType]
  amount: bigint
  price: bigint
  timestamp: bigint
  parsedAt: number // 解析时间戳
}

// 缓存数据结构
interface CacheData {
  lastUpdate: number
  lastSignature?: string
  events: TradeEventData[]
  totalEvents: number
  monitorStartTime: number
}

class TradingMonitor {
  private connection: Connection
  private isRunning = false
  private cache: CacheData = {
    lastUpdate: 0,
    events: [],
    totalEvents: 0,
    monitorStartTime: Date.now()
  }

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, 'confirmed')
  }

  /**
   * 初始化监控器
   */
  async initialize(): Promise<void> {
    try {
      // 创建缓存目录
      await fs.mkdir(CONFIG.CACHE_DIR, { recursive: true })
      
      // 加载现有缓存
      await this.loadCache()
      
      // 记录启动日志
      await this.log('Monitor initialized successfully')
      console.log('🎯 SL Trading 监控器已启动')
      console.log(`📁 缓存目录: ${CONFIG.CACHE_DIR}`)
      console.log(`🔗 RPC地址: ${CONFIG.RPC_URL}`)
      console.log(`📋 程序地址: ${CONFIG.PROGRAM_ADDRESS}`)
      console.log(`⏰ 监控间隔: ${CONFIG.MONITOR_INTERVAL / 1000}秒`)
      
    } catch (error) {
      await this.log(`Initialization failed: ${error}`)
      throw error
    }
  }

  /**
   * 开始监控
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ 监控器已在运行中')
      return
    }

    this.isRunning = true
    await this.log('Monitor started')
    console.log('🚀 开始监控交易事件...')

    // 立即执行一次
    await this.fetchAndCacheEvents()

    // 设置定时任务
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval)
        return
      }

      try {
        await this.fetchAndCacheEvents()
      } catch (error) {
        await this.log(`Monitor iteration failed: ${error}`)
        console.error('❌ 监控迭代失败:', error)
      }
    }, CONFIG.MONITOR_INTERVAL)

    // 处理优雅关闭
    process.on('SIGINT', () => {
      console.log('\n🛑 收到关闭信号，正在停止监控器...')
      this.stop()
      process.exit(0)
    })
  }

  /**
   * 停止监控
   */
  async stop(): Promise<void> {
    this.isRunning = false
    await this.saveCache()
    await this.log('Monitor stopped')
    console.log('⏹️ 监控器已停止')
  }

  /**
   * 获取并缓存交易事件
   */
  private async fetchAndCacheEvents(): Promise<void> {
    const startTime = Date.now()
    console.log(`⏳ [${new Date().toLocaleTimeString('zh-CN')}] 开始获取交易事件...`)

    try {
      // 获取程序地址的签名
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(CONFIG.PROGRAM_ADDRESS),
        {
          limit: CONFIG.BATCH_SIZE,
          before: this.cache.lastSignature
        }
      )

      if (!signatures || signatures.length === 0) {
        console.log('📭 没有发现新的交易事件')
        return
      }

      console.log(`📥 发现 ${signatures.length} 个新签名`)

      // 批量获取交易详情
      const newEvents = await this.parseTransactionBatch(signatures)
      
      if (newEvents.length > 0) {
        // 更新缓存
        this.cache.events.unshift(...newEvents) // 新事件插入到前面
        this.cache.totalEvents += newEvents.length
        this.cache.lastUpdate = Date.now()
        this.cache.lastSignature = signatures[0].signature

        // 保持缓存大小合理
        if (this.cache.events.length > CONFIG.MAX_CACHE_EVENTS) {
          this.cache.events = this.cache.events.slice(0, CONFIG.MAX_CACHE_EVENTS)
        }

        // 保存到文件
        await this.saveCache()

        const duration = Date.now() - startTime
        console.log(`✅ 成功缓存 ${newEvents.length} 个交易事件 (耗时: ${duration}ms)`)
        await this.log(`Cached ${newEvents.length} new events in ${duration}ms`)
      } else {
        console.log('📝 没有解析到有效的交易事件')
      }

    } catch (error) {
      console.error('❌ 获取交易事件失败:', error)
      await this.log(`Failed to fetch events: ${error}`)
    }
  }

  /**
   * 批量解析交易
   */
  private async parseTransactionBatch(signatures: any[]): Promise<TradeEventData[]> {
    const results: TradeEventData[] = []
    
    // 分批处理以避免RPC限制
    for (let i = 0; i < signatures.length; i += CONFIG.CONCURRENCY_LIMIT) {
      const batch = signatures.slice(i, i + CONFIG.CONCURRENCY_LIMIT)
      
      const promises = batch.map(async (sig) => {
        try {
          const transaction = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          })
          
          if (transaction) {
            const events = await this.parseTradeEventsFromTransaction(transaction, sig.blockTime)
            return events
          }
          return []
        } catch (error) {
          console.warn(`⚠️ 解析交易失败 ${sig.signature}:`, error)
          return []
        }
      })

      const batchResults = await Promise.all(promises)
      results.push(...batchResults.flat())

      // 添加小延迟避免RPC限流
      if (i + CONFIG.CONCURRENCY_LIMIT < signatures.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * 从交易中解析交易事件
   */
  private async parseTradeEventsFromTransaction(transaction: any, blockTime: number): Promise<TradeEventData[]> {
    const events: TradeEventData[] = []

    if (!transaction.meta?.logMessages) {
      return events
    }

    const decoder = getTradeEventDecoder()

    for (const log of transaction.meta.logMessages) {
      if (log.startsWith('Program data: ')) {
        try {
          const dataBase64 = log.substring('Program data: '.length)
          const data = Buffer.from(dataBase64, 'base64')

          // 检查事件标识符 (前8字节)
          const eventDiscriminator = Array.from(data.slice(0, 8))
          const tradeEventDiscriminator = [70, 17, 81, 98, 153, 122, 109, 59] // TradeEvent的标识符

          if (JSON.stringify(eventDiscriminator) === JSON.stringify(tradeEventDiscriminator)) {
            const event = decoder.decode(data.slice(8))
            
            events.push({
              signature: transaction.transaction.signatures[0],
              blockTime: blockTime || Math.floor(Date.now() / 1000),
              slot: transaction.slot,
              id: event.id,
              userId: event.userId,
              fundId: event.fundId,
              tradeType: event.tradeType,
              amount: event.amount,
              price: event.price,
              timestamp: event.timestamp,
              parsedAt: Date.now()
            })
          }
        } catch (error) {
          // 忽略解析错误，可能不是TradeEvent
        }
      }
    }

    return events
  }

  /**
   * 加载缓存
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(CONFIG.CACHE_FILE, 'utf-8')
      this.cache = JSON.parse(data, (key, value) => {
        // 恢复 BigInt 类型
        if (typeof value === 'string' && /^\d+n$/.test(value)) {
          return BigInt(value.slice(0, -1))
        }
        return value
      })
      console.log(`📂 加载了 ${this.cache.events.length} 个缓存事件`)
    } catch (error) {
      console.log('📂 没有找到缓存文件，将创建新的缓存')
    }
  }

  /**
   * 保存缓存
   */
  private async saveCache(): Promise<void> {
    try {
      const data = JSON.stringify(this.cache, (key, value) => {
        // 序列化 BigInt 类型
        if (typeof value === 'bigint') {
          return value.toString() + 'n'
        }
        return value
      }, 2)
      
      await fs.writeFile(CONFIG.CACHE_FILE, data)
    } catch (error) {
      console.error('❌ 保存缓存失败:', error)
    }
  }

  /**
   * 记录日志
   */
  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    
    try {
      await fs.appendFile(CONFIG.LOG_FILE, logMessage)
    } catch (error) {
      console.error('❌ 写入日志失败:', error)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const runTime = Date.now() - this.cache.monitorStartTime
    return {
      isRunning: this.isRunning,
      totalEvents: this.cache.totalEvents,
      cachedEvents: this.cache.events.length,
      lastUpdate: this.cache.lastUpdate ? new Date(this.cache.lastUpdate).toLocaleString('zh-CN') : 'Never',
      runTime: Math.floor(runTime / 1000) + '秒',
      programAddress: CONFIG.PROGRAM_ADDRESS,
      rpcUrl: CONFIG.RPC_URL
    }
  }
}

// 主函数
async function main() {
  try {
    // 首先加载生成的模块
    await loadGeneratedModules()
    
    const monitor = new TradingMonitor()
    await monitor.initialize()
    await monitor.start()
  } catch (error) {
    console.error('❌ 监控器启动失败:', error)
    process.exit(1)
  }
}

// 直接运行主函数
main().catch(console.error)

export { TradingMonitor, type TradeEventData, type CacheData } 