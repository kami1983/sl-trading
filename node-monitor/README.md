# SL Trading Node Monitor

基于 NestJS 的 SL Trading 监控后端服务。

## 项目概述

这是一个使用 NestJS 框架创建的基础后端项目，用于监控 SL Trading 程序的交易事件。

## 技术栈

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm
- **Solana**: Web3.js + Kit
- **Code Generation**: Codama

## 项目结构

```
node-monitor/
├── src/
│   ├── app.controller.ts      # 主控制器
│   ├── app.service.ts         # 主服务
│   ├── app.module.ts          # 根模块
│   ├── main.ts               # 应用入口
│   ├── test-types.ts         # 类型测试文件
│   └── generated/            # 生成的类型文件
│       ├── index.ts          # 统一导出
│       ├── instructions/     # 指令函数
│       ├── programs/         # 程序相关工具
│       ├── shared/           # 共享类型
│       └── types/            # 类型定义
│           ├── index.ts      # 类型导出
│           ├── tradeEvent.ts # 交易事件类型
│           └── tradeType.ts  # 交易类型枚举
├── scripts/
│   └── generate-types.ts     # 类型生成脚本
├── test/                     # 测试文件
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── nest-cli.json            # Nest CLI 配置
├── README.md                # 项目说明
└── env.example              # 环境变量示例
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 生成类型文件

```bash
npm run generate-types
```

这将从 `target/idl/sl_trading.json` 生成 TypeScript 类型文件到 `src/generated/` 目录。

### 测试生成的类型

```bash
npx ts-node src/test-types.ts
```

### 开发模式

```bash
npm run start:dev
```

服务器将在 `http://localhost:3000` 启动。

### 生产模式

```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start:prod
```

### 测试

```bash
# 单元测试
npm run test

# 端到端测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 生成的类型

### TradeEvent

```typescript
export type TradeEvent = {
  id: string;
  userId: string;
  fundId: string;
  tradeType: TradeType;
  amount: bigint;
  price: bigint;
  timestamp: bigint;
};
```

### TradeType

```typescript
export enum TradeType {
  BUY = 0,
  SELL = 1,
}
```

### 编码器和解码器

- `getTradeEventEncoder()` - 交易事件编码器
- `getTradeEventDecoder()` - 交易事件解码器
- `getTradeTypeEncoder()` - 交易类型编码器
- `getTradeTypeDecoder()` - 交易类型解码器

## API 端点

### 基础端点

- `GET /` - 健康检查

## 开发指南

### 添加新的控制器

```bash
nest generate controller events
```

### 添加新的服务

```bash
nest generate service events
```

### 添加新的模块

```bash
nest generate module events
```

### 代码格式化

```bash
npm run format
```

### 代码检查

```bash
npm run lint
```

### 重新生成类型

当 `target/idl/sl_trading.json` 更新时，重新生成类型：

```bash
npm run generate-types
```

## 环境配置

可以通过环境变量配置：

- `PORT` - 服务器端口 (默认: 3000)
- `NODE_ENV` - 环境模式 (development/production)

## 类型使用示例

```typescript
import { TradeEvent, TradeType, getTradeEventDecoder } from './generated/types';

// 创建交易事件
const tradeEvent: TradeEvent = {
  id: 'trade-001',
  userId: 'user-123',
  fundId: 'fund-456',
  tradeType: TradeType.BUY,
  amount: BigInt(1000000000),
  price: BigInt(50000000),
  timestamp: BigInt(Date.now() / 1000),
};

// 解码事件数据
const decoder = getTradeEventDecoder();
const decodedEvent = decoder.decode(eventData);
```

## 下一步计划

1. ✅ 集成 Codama 类型生成
2. ✅ 添加 Solana Web3.js 客户端
3. 🔄 实现交易事件监控服务
4. 🔄 添加缓存管理
5. 🔄 实现 RESTful API 接口
6. 🔄 添加数据验证和错误处理
7. 🔄 集成日志和监控

## 许可证

MIT
