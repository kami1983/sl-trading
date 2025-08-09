#!/usr/bin/env ts-node

/**
 * 使用 Codama 生成 SL Trading 合约类型文件
 */

import { createFromRoot } from 'codama';
import { rootNodeFromAnchor, type AnchorIdl } from '@codama/nodes-from-anchor';
import { renderVisitor as renderJavaScriptVisitor } from '@codama/renderers-js';
import path from 'path';
import fs from 'fs';

// 读取 IDL 文件
const idlPath = path.join(__dirname, '../../target/idl/sl_trading.json');
const idlContent = fs.readFileSync(idlPath, 'utf-8');
const anchorIdl = JSON.parse(idlContent) as AnchorIdl;

console.log('🚀 开始使用 Codama 生成 SL Trading 类型文件...');

// 创建 Codama 实例
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

// 定义输出目录
const outputDir = path.join(__dirname, '../src/generated');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 生成 JavaScript/TypeScript 类型文件
console.log('📝 生成 TypeScript 类型文件...');
codama.accept(renderJavaScriptVisitor(outputDir));

console.log('✅ 类型文件生成完成！');
console.log(`📁 输出目录: ${outputDir}`);
console.log('');
console.log('生成的文件包括:');
console.log('- instructions/ - 指令函数');
console.log('- types/ - 类型定义');
console.log('- programs/ - 程序相关工具');
console.log('- index.ts - 统一导出');
console.log('');
console.log('🎯 主要类型:');
console.log('- TradeEvent - 交易事件类型');
console.log('- TradeType - 交易类型枚举');
console.log('- getTradeEventDecoder - 事件解码器');
console.log('- getTradeEventEncoder - 事件编码器'); 