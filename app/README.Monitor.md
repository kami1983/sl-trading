# SL Trading 监控器配置指南

## 🔧 环境变量配置

监控器使用 Next.js 内置的环境变量系统，支持标准的 `.env` 文件配置。

### 📁 配置文件（Next.js 标准）

- **主配置文件**: `.env`
- **示例配置**: `.env.example`
- **本地配置**: `.env.local` (Git 忽略，优先级最高)
- **环境特定**: `.env.development`, `.env.production`

### ⚙️ 配置参数

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `MONITOR_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC 节点地址 |
| `MONITOR_PROGRAM_ADDRESS` | `EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi` | SL Trading 程序地址 |
| `MONITOR_INTERVAL_SECONDS` | `60` | 监控间隔（秒） |
| `MONITOR_BATCH_SIZE` | `50` | 每次获取的交易数量 |
| `MONITOR_CONCURRENCY_LIMIT` | `5` | 并发请求限制 |
| `MONITOR_CACHE_DIR` | `./cache` | 缓存目录路径 |
| `MONITOR_MAX_CACHE_EVENTS` | `1000` | 最大缓存事件数量 |
| `MONITOR_LOG_LEVEL` | `info` | 日志级别 |

## 🚀 使用方法

### 1. 复制配置文件
```bash
cp .env.example .env
```

### 2. 编辑配置
```bash
# 编辑 .env 文件
nano .env
```

### 3. 运行监控器
```bash
# 启动监控器
npm run monitor

# 查看当前配置
npm run monitor:help
```

## 📖 配置示例

### 开发环境配置
```bash
# .env.development
MONITOR_RPC_URL=https://api.devnet.solana.com
MONITOR_INTERVAL_SECONDS=30
MONITOR_BATCH_SIZE=20
MONITOR_LOG_LEVEL=debug
```

### 生产环境配置
```bash
# .env.production
MONITOR_RPC_URL=https://api.mainnet-beta.solana.com
MONITOR_INTERVAL_SECONDS=120
MONITOR_BATCH_SIZE=100
MONITOR_MAX_CACHE_EVENTS=5000
MONITOR_LOG_LEVEL=warn
```

### 本地开发配置
```bash
# .env.local (Git 忽略，不会提交)
MONITOR_RPC_URL=https://your-custom-rpc.com
MONITOR_PROGRAM_ADDRESS=YourProgramAddressHere
```

## 🌍 Next.js 环境变量优先级

配置参数的优先级顺序（高到低）：
1. 系统环境变量（最高）
2. `.env.local` 文件
3. `.env.development` / `.env.production`
4. `.env` 文件
5. 代码中的默认值（最低）

### 通过系统环境变量覆盖
```bash
# 临时设置环境变量
export MONITOR_INTERVAL_SECONDS=30
npm run monitor

# 或在运行时设置
MONITOR_INTERVAL_SECONDS=30 npm run monitor
```

## 🔄 网络配置

### Devnet（测试网）
```bash
MONITOR_RPC_URL=https://api.devnet.solana.com
```

### Mainnet（主网）
```bash
MONITOR_RPC_URL=https://api.mainnet-beta.solana.com
```

### 自定义RPC节点
```bash
# 使用付费RPC服务（更稳定，更快）
MONITOR_RPC_URL=https://solana-api.projectserum.com
MONITOR_RPC_URL=https://api.rpcpool.com/YOUR_API_KEY
```

## 📊 性能调优

### 高频监控
```bash
MONITOR_INTERVAL_SECONDS=10      # 每10秒检查一次
MONITOR_BATCH_SIZE=20            # 减少批次大小
MONITOR_CONCURRENCY_LIMIT=3      # 降低并发数
```

### 低频监控
```bash
MONITOR_INTERVAL_SECONDS=300     # 每5分钟检查一次
MONITOR_BATCH_SIZE=100           # 增加批次大小
MONITOR_CONCURRENCY_LIMIT=10     # 提高并发数
```

### 大缓存配置
```bash
MONITOR_MAX_CACHE_EVENTS=10000   # 缓存更多事件
MONITOR_CACHE_DIR=./data/cache   # 使用专门的数据目录
```

## 🐛 调试配置

### 启用详细日志
```bash
MONITOR_LOG_LEVEL=debug
```

### 快速测试
```bash
MONITOR_INTERVAL_SECONDS=5       # 5秒间隔
MONITOR_BATCH_SIZE=5             # 小批次
MONITOR_LOG_LEVEL=debug          # 详细日志
```

## 📝 配置验证

运行以下命令查看当前配置：
```bash
npm run monitor:help
```

该命令会显示所有当前生效的配置值。

## ⚠️ 注意事项

1. **RPC限制**: 公共RPC节点有速率限制，高频监控可能被限流
2. **网络选择**: 确保程序地址在对应网络上存在
3. **缓存大小**: 缓存太大会占用更多内存
4. **并发限制**: 过高的并发可能导致RPC错误

## 🔒 安全建议

- 不要在代码中硬编码RPC API密钥
- 将包含敏感信息的 `monitor.env` 添加到 `.gitignore`
- 生产环境使用专用的RPC端点
- 定期轮换API密钥 