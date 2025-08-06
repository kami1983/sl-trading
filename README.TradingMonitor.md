# SL Trading 交易事件监控器

## 📋 功能描述

这是一个自动运行的监控程序，用于：
- 每分钟自动读取 SL Trading 程序的交易事件
- 解析 Anchor 事件数据（TradeEvent）
- 将数据缓存到本地 JSON 文件
- 提供详细的运行日志和统计信息

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动监控器
```bash
# 启动监控器
npm run monitor

# 开发模式（文件变化时自动重启）
npm run monitor:dev
```

### 3. 查看监控状态
```bash
# 查看当前状态
npm run monitor:status

# 查看帮助信息
npm run monitor:help
```

## 📁 文件结构

```
scripts/
├── trading-monitor.ts     # 主监控脚本
├── monitor-status.ts      # 状态查看脚本
└── README.md             # 说明文档

cache/                     # 自动创建的缓存目录
├── trading-events.json    # 交易事件缓存
└── monitor.log           # 运行日志
```

## ⚙️ 配置说明

监控器配置在 `scripts/trading-monitor.ts` 中：

```typescript
const CONFIG = {
  // SL Trading 程序地址
  PROGRAM_ADDRESS: 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi',
  
  // Solana RPC 节点
  RPC_URL: 'https://api.devnet.solana.com',
  
  // 监控间隔（毫秒）
  MONITOR_INTERVAL: 60 * 1000,  // 1分钟
  
  // 每次获取的交易数量
  BATCH_SIZE: 50,
  
  // 并发请求限制
  CONCURRENCY_LIMIT: 5,
}
```

## 📊 数据格式

### 缓存的交易事件数据格式：
```json
{
  "lastUpdate": 1640995200000,
  "lastSignature": "5KJp...",
  "totalEvents": 42,
  "monitorStartTime": 1640995000000,
  "events": [
    {
      "signature": "5KJp...",
      "blockTime": 1640995200,
      "slot": 123456789,
      "id": "trade-001",
      "userId": "user-abc", 
      "fundId": "fund-xyz",
      "tradeType": 0,        // 0=BUY, 1=SELL
      "amount": "1000000n",  // BigInt 格式
      "price": "50000000n",
      "timestamp": "1640995200n",
      "parsedAt": 1640995200123
    }
  ]
}
```

## 🔍 监控器功能

### 自动数据采集
- **增量更新**：只获取上次检查后的新交易
- **断点续传**：重启后从最后一个签名继续
- **智能解析**：自动识别 TradeEvent 事件
- **错误恢复**：网络错误时自动重试

### 性能优化
- **批量处理**：分批获取交易以避免 RPC 限制
- **并发控制**：限制同时请求数量
- **缓存管理**：自动清理过期数据（保留最近1000条）
- **频率控制**：请求间添加延迟避免限流

### 数据完整性
- **类型安全**：完整的 TypeScript 类型定义
- **数据验证**：事件格式校验
- **时间戳修正**：处理历史数据时间异常
- **签名跟踪**：基于交易签名的增量同步

## 📈 监控统计

运行 `npm run monitor:status` 可以查看：

- **基础信息**：运行时间、总事件数、缓存状态
- **事件统计**：买入/卖出事件数量
- **最近活动**：最新5个交易事件
- **用户统计**：唯一用户和基金数量
- **系统日志**：最近的运行日志

## 🛠️ 常用命令

```bash
# 启动监控器
npm run monitor

# 后台运行（推荐生产环境）
nohup npm run monitor > monitor.log 2>&1 &

# 查看状态
npm run monitor:status

# 查看缓存文件
cat cache/trading-events.json | jq .

# 查看运行日志
tail -f cache/monitor.log

# 停止监控器
# 使用 Ctrl+C 或发送 SIGINT 信号
```

## 🔧 故障排除

### 常见问题

1. **缓存文件损坏**
   ```bash
   rm cache/trading-events.json
   npm run monitor
   ```

2. **网络连接问题**
   - 检查 RPC 节点状态
   - 尝试更换 RPC_URL

3. **权限问题**
   ```bash
   chmod +x scripts/trading-monitor.ts
   ```

4. **依赖问题**
   ```bash
   npm install
   npm run monitor
   ```

### 调试模式

在监控脚本中启用详细日志：
```typescript
// 在 CONFIG 中添加
DEBUG: true
```

## 📝 开发说明

### 扩展监控器

要添加新功能，可以修改 `TradingMonitor` 类：

```typescript
class TradingMonitor {
  // 添加新的配置
  private customConfig = { ... }
  
  // 添加新的处理方法
  private async processCustomEvent(event: TradeEventData) {
    // 自定义处理逻辑
  }
}
```

### 自定义解析器

要支持其他类型的事件：

```typescript
private async parseCustomEvents(transaction: any): Promise<CustomEventData[]> {
  // 自定义解析逻辑
}
```

## 🔐 安全注意事项

- **只读访问**：监控器只读取链上数据，不执行任何写操作
- **API 密钥**：如使用付费 RPC，请妥善保管 API 密钥
- **缓存清理**：定期清理缓存文件避免磁盘占用过大
- **网络安全**：确保 RPC 连接使用 HTTPS

## 📞 支持

如有问题，请检查：
1. 监控器日志：`cache/monitor.log`
2. 缓存状态：`npm run monitor:status`
3. 网络连接：测试 RPC 节点可用性
4. 程序状态：确认 SL Trading 程序正常运行

---

✨ **Happy Monitoring!** 监控器将为您提供 SL Trading 程序的实时交易数据！ 