#!/usr/bin/env ts-node

/**
 * SL Trading 简化监控脚本
 * 功能：每分钟自动读取 SL Trading 程序的交易事件并缓存到文件
 */

import fs from 'fs/promises'
import path from 'path'
import { Connection, PublicKey } from '@solana/web3.js'

// 硬编码配置以避免导入问题
const CONFIG = {
  // 程序地址 - 与 SL_TRADING_PROGRAM_ADDRESS 相同
  PROGRAM_ADDRESS: 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi',
  
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
  
  // 文件路径
  CACHE_FILE: '',
  LOG_FILE: '',
}

// 构建文件路径
CONFIG.CACHE_FILE = path.join(CONFIG.CACHE_DIR, 'trading-events.json')
CONFIG.LOG_FILE = path.join(CONFIG.CACHE_DIR, 'monitor.log')

// TradeEvent 数据类型 (与 account-data-access.tsx 保持一致)
interface TradeEventData {
  signature: string
  blockTime: number
  slot: number
  id: string
  userId: string
  fundId: string
  tradeType: number // 0=BUY, 1=SELL
  amount: bigint
  price: bigint
  timestamp: bigint
  parsedAt: number
}

// 缓存数据结构
interface CacheData {
  lastUpdate: number
  lastSignature?: string
  events: TradeEventData[]
  totalEvents: number
  monitorStartTime: number
}

class SimpleMonitor {
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

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(CONFIG.CACHE_DIR, { recursive: true })
      await this.loadCache()
      await this.log('Simple monitor initialized successfully')
      
      console.log('🎯 SL Trading 简化监控器已启动')
      console.log(`📁 缓存目录: ${CONFIG.CACHE_DIR}`)
      console.log(`🔗 RPC地址: ${CONFIG.RPC_URL}`)
      console.log(`📋 程序地址: ${CONFIG.PROGRAM_ADDRESS}`)
      console.log(`⏰ 监控间隔: ${CONFIG.MONITOR_INTERVAL / 1000}秒`)
      
    } catch (error) {
      await this.log(`Initialization failed: ${error}`)
      throw error
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ 监控器已在运行中')
      return
    }

    this.isRunning = true
    await this.log('Simple monitor started')
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
    process.on('SIGINT', async () => {
      console.log('\n🛑 收到关闭信号，正在停止监控器...')
      this.stop()
      console.log('💾 正在保存最终缓存...')
      await this.saveCache()
      console.log('✅ 缓存已保存，安全退出')
      process.exit(0)
    })
  }

  async stop(): Promise<void> {
    this.isRunning = false
    await this.saveCache()
    await this.log('Simple monitor stopped')
    console.log('⏹️ 监控器已停止')
  }

  private async fetchAndCacheEvents(): Promise<void> {
    const startTime = Date.now()
    console.log(`⏳ [${new Date().toLocaleTimeString('zh-CN')}] 开始获取交易事件...`)

    try {
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

      // 获取已存在的签名集合用于去重
      const existingSignatures = new Set(this.cache.events.map(event => event.signature))
      
      // 过滤掉重复的签名
      const uniqueSignatures = signatures.filter(sig => !existingSignatures.has(sig.signature))
      
      if (uniqueSignatures.length === 0) {
        console.log('📝 所有签名都已存在，无新增事件')
        return
      }
      
      console.log(`📋 过滤后的新签名: ${uniqueSignatures.length} 个 (总共获取: ${signatures.length} 个)`)

      // 解析实际的 TradeEvent 数据
      const newEvents: TradeEventData[] = []
      
      // 批量处理交易
      const batchSize = CONFIG.CONCURRENCY_LIMIT
      for (let i = 0; i < uniqueSignatures.length; i += batchSize) {
        const batch = uniqueSignatures.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (sig) => {
          try {
            const transactionResponse = await this.connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            })

            if (transactionResponse?.meta?.logMessages) {
              const events = this.parseTradeEventsFromTransaction(
                transactionResponse,
                sig.blockTime || undefined
              )
              
              // 为每个事件添加签名和解析时间
              return events.map((event: any) => ({
                ...event,
                signature: sig.signature,
                blockTime: sig.blockTime || 0,
                slot: sig.slot,
                parsedAt: Date.now()
              }))
            }
            return []
          } catch (error) {
            console.warn(`⚠️ 解析交易失败 ${sig.signature}:`, error)
            return []
          }
        })

        const batchResults = await Promise.all(batchPromises)
        newEvents.push(...batchResults.flat())

        // 添加小延迟避免RPC限流
        if (i + batchSize < uniqueSignatures.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // 添加新事件到缓存
      this.cache.events.unshift(...newEvents)
      this.cache.totalEvents += newEvents.length
      this.cache.lastUpdate = Date.now()
      this.cache.lastSignature = signatures[0].signature

      // 保持缓存大小合理
      if (this.cache.events.length > CONFIG.MAX_CACHE_EVENTS) {
        this.cache.events = this.cache.events.slice(0, CONFIG.MAX_CACHE_EVENTS)
      }

      await this.saveCache()

      const duration = Date.now() - startTime
      console.log(`✅ 成功缓存 ${newEvents.length} 个新交易签名 (耗时: ${duration}ms)`)
      console.log(`📊 当前缓存总数: ${this.cache.events.length} 个事件`)
      await this.log(`Cached ${newEvents.length} new unique signatures in ${duration}ms (total: ${this.cache.events.length})`)

    } catch (error) {
      console.error('❌ 获取交易事件失败:', error)
      await this.log(`Failed to fetch events: ${error}`)
    }
  }

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
      
      // 去重处理：移除重复的签名
      const uniqueEvents = new Map<string, TradeEventData>()
      this.cache.events.forEach(event => {
        if (!uniqueEvents.has(event.signature)) {
          uniqueEvents.set(event.signature, event)
        }
      })
      
      const originalCount = this.cache.events.length
      this.cache.events = Array.from(uniqueEvents.values())
      const uniqueCount = this.cache.events.length
      
      console.log(`📂 加载了 ${originalCount} 个缓存事件`)
      if (originalCount > uniqueCount) {
        console.log(`🔄 去重后保留 ${uniqueCount} 个唯一事件 (移除了 ${originalCount - uniqueCount} 个重复项)`)
        // 保存去重后的缓存
        await this.saveCache()
      }
    } catch (error) {
      console.log('📂 没有找到缓存文件，将创建新的缓存')
    }
  }

  private async saveCache(): Promise<void> {
    try {
      console.log(`💾 开始保存缓存到: ${CONFIG.CACHE_FILE}`)
      console.log(`📊 缓存数据统计: ${this.cache.events.length} 个事件, 总数: ${this.cache.totalEvents}`)
      
      const data = JSON.stringify(this.cache, (key, value) => {
        // 序列化 BigInt 类型
        if (typeof value === 'bigint') {
          return value.toString() + 'n'
        }
        return value
      }, 2)
      
      console.log(`📝 数据大小: ${data.length} 字符`)
      await fs.writeFile(CONFIG.CACHE_FILE, data)
      console.log(`✅ 缓存保存成功`)
    } catch (error) {
      console.error('❌ 保存缓存失败:', error)
    }
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    
    try {
      await fs.appendFile(CONFIG.LOG_FILE, logMessage)
    } catch (error) {
      console.error('❌ 写入日志失败:', error)
    }
  }

  // 解析交易中的 TradeEvent 数据 (参考 account-data-access.tsx)
  private parseTradeEventsFromTransaction(transactionResponse: any, blockTime?: number): any[] {
    const events: any[] = []

    try {
      if (transactionResponse?.meta?.logMessages) {
        console.log(`🔍 解析交易日志，共 ${transactionResponse.meta.logMessages.length} 条日志`)
        
        // 检查是否是SL Trading相关的交易
        const isSlTradingTransaction = transactionResponse.meta.logMessages.some((log: string) => 
          log.includes(`Program ${CONFIG.PROGRAM_ADDRESS} invoke`) ||
          log.includes('Trade event emitted') ||
          log.startsWith('Program data: ')
        )
        
        if (!isSlTradingTransaction) {
          console.log('⏭️ 非SL Trading交易，跳过')
          return events
        }
        
        console.log('✅ 确认为SL Trading交易，开始解析事件')
        
        // 解析 Anchor 事件数据
        const anchorEvents = this.parseAnchorEventsFromLogs(transactionResponse.meta.logMessages, blockTime)
        events.push(...anchorEvents)
        
        console.log(`📊 解析结果: ${events.length} 个事件`)
      } else {
        console.log('⚠️ 交易无日志消息')
      }
    } catch (error) {
      console.warn('Failed to parse trade events from transaction:', error)
    }

    return events
  }

  // 解析 Anchor 事件 (参考 account-data-access.tsx)
  private parseAnchorEventsFromLogs(logs: readonly string[], blockTime?: number): any[] {
    const events: any[] = []
    
    for (const log of logs) {
      try {
        // 查找包含 Program data 的日志
        if (log.startsWith('Program data: ')) {
          const dataBase64 = log.substring('Program data: '.length)
          const data = Buffer.from(dataBase64, 'base64')

          // 检查事件标识符 (前8字节) - TradeEvent的标识符
          const eventDiscriminator = data.slice(0, 8)
          const tradeEventDiscriminator = Buffer.from([189, 219, 127, 211, 78, 230, 97, 238]) // 正确的TradeEvent discriminator

          if (eventDiscriminator.equals(tradeEventDiscriminator)) {
            console.log('🎯 找到 TradeEvent 数据，开始手动解析...')
            
            try {
              // 手动解析TradeEvent结构 (跳过前8字节discriminator)
              let offset = 8
              
              // 解析字符串字段 (每个字符串前有4字节长度前缀)
              const idLength = data.readUInt32LE(offset)
              offset += 4
              const id = data.toString('utf8', offset, offset + idLength)
              offset += idLength
              
              const userIdLength = data.readUInt32LE(offset)
              offset += 4
              const userId = data.toString('utf8', offset, offset + userIdLength)
              offset += userIdLength
              
              const fundIdLength = data.readUInt32LE(offset)
              offset += 4
              const fundId = data.toString('utf8', offset, offset + fundIdLength)
              offset += fundIdLength
              
              // 解析 tradeType (1字节)
              const tradeType = data.readUInt8(offset)
              offset += 1
              
              // 解析 amount (8字节 u64)
              const amount = data.readBigUInt64LE(offset)
              offset += 8
              
              // 解析 price (8字节 u64)
              const price = data.readBigUInt64LE(offset)
              offset += 8
              
              // 解析 timestamp (8字节 i64)
              const timestamp = data.readBigInt64LE(offset)
              
              const event = {
                id,
                userId,
                fundId,
                tradeType,
                amount,
                price,
                timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)), // 使用区块时间
              }
              
              console.log('✅ 手动解析成功:', { id, userId, fundId, tradeType, amount: amount.toString(), price: price.toString() })
              events.push(event)
            } catch (parseError) {
              console.warn('❌ 手动解析Anchor事件失败:', parseError)
              // 仍然添加一个基本事件，避免丢失数据
              const event = {
                id: `failed-parse-${Date.now()}`,
                userId: 'parse-error',
                fundId: 'parse-error',
                tradeType: 0,
                amount: BigInt(0),
                price: BigInt(0),
                timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)),
              }
              events.push(event)
            }
          }
        }
      } catch (error) {
        console.warn('解析事件时出错:', error)
      }
    }

    // 如果没有找到事件，也尝试从普通日志解析
    if (events.length === 0) {
      for (const log of logs) {
        if (log.includes('Trade event emitted')) {
          console.log('📝 从日志消息解析事件:', log)
          
          // 解析格式: "Trade event emitted - ID: xxx, Type: xxx, Amount: xxx, Price: xxx"
          const idMatch = log.match(/ID: ([^,]+)/)
          const typeMatch = log.match(/Type: (BUY|SELL)/)
          const amountMatch = log.match(/Amount: (\d+)/)
          const priceMatch = log.match(/Price: (\d+)/)
          
          if (idMatch && typeMatch && amountMatch && priceMatch) {
            const event = {
              id: idMatch[1].trim(),
              userId: 'parsed-from-log', // 日志中可能没有这些信息
              fundId: 'parsed-from-log',
              tradeType: typeMatch[1] === 'BUY' ? 0 : 1,
              amount: BigInt(amountMatch[1]),
              price: BigInt(priceMatch[1]),
              timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)),
            }
            console.log('🎯 解析到真实交易数据:', event)
            events.push(event)
          } else {
            console.log('⚠️ 无法解析日志格式')
          }
          break
        }
      }
    }

    return events
  }
}

// 主函数
async function main() {
  const monitor = new SimpleMonitor()
  
  try {
    await monitor.initialize()
    await monitor.start()
  } catch (error) {
    console.error('❌ 监控器启动失败:', error)
    process.exit(1)
  }
}

// 直接运行主函数
main().catch(console.error) 