import { createFromRoot } from 'codama';
import { rootNodeFromAnchor, type AnchorIdl } from '@codama/nodes-from-anchor';
import { renderVisitor as renderJavaScriptVisitor } from '@codama/renderers-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 IDL 文件
const idlPath = path.join(__dirname, '../../target/idl/sl_trading.json');
const idlContent = fs.readFileSync(idlPath, 'utf-8');
const anchorIdl = JSON.parse(idlContent) as AnchorIdl;

console.log('🚀 开始使用 Codama 生成客户端代码...');

// 创建 Codama 实例
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

// 定义输出目录
const outputDir = path.join(__dirname, '../src/generated');

// 生成 JavaScript/TypeScript 客户端
console.log('📝 生成 JavaScript/TypeScript 客户端...');
codama.accept(renderJavaScriptVisitor(outputDir));

console.log('✅ 客户端代码生成完成！');
console.log(`📁 输出目录: ${outputDir}`);
console.log('');
console.log('生成的文件包括:');
console.log('- instructions/ - 指令函数');
console.log('- accounts/ - 账户类型和获取函数');
console.log('- programs/ - 程序相关工具');
console.log('- types/ - 类型定义');
console.log('- index.ts - 统一导出'); 