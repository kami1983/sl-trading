/**
 * 测试 TradeEvent 事件解析
 */

import { EventParserService } from './services/event-parser.service';
import { TradeType } from './generated/types';

// 模拟配置
const config = {
  programAddress: 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi',
  rpcUrl: 'https://api.devnet.solana.com'
};

// 创建解析服务
const parser = new EventParserService(config);

// 模拟交易响应数据
const mockTransactionResponse = {
  slot: 123456789,
  blockTime: Math.floor(Date.now() / 1000),
  meta: {
    logMessages: [
      'Program EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi invoke [1]',
      'Program data: BdDb7fD3Nee61eeAAABidHJhZGUwMDEAAAB1c2VyLTEyMwAAAGZ1bmQtNDU2AAAAAA==',
      'Program EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi success'
    ]
  }
};

async function testEventParser() {
  console.log('🧪 测试 TradeEvent 事件解析...');

  try {
    // 解析事件
    const events = await parser.parseTradeEventsFromTransaction(
      mockTransactionResponse as any,
      'test-signature-123',
      mockTransactionResponse.blockTime
    );

    console.log('📊 解析结果:');
    console.log(`  找到 ${events.length} 个事件`);

    events.forEach((event, index) => {
      console.log(`\n事件 ${index + 1}:`);
      console.log(`  ID: ${event.id}`);
      console.log(`  User ID: ${event.userId}`);
      console.log(`  Fund ID: ${event.fundId}`);
      console.log(`  Trade Type: ${event.tradeType === TradeType.BUY ? 'BUY' : 'SELL'}`);
      console.log(`  Amount: ${event.amount.toString()} lamports`);
      console.log(`  Price: ${event.price.toString()} lamports`);
      console.log(`  Timestamp: ${new Date(Number(event.timestamp) * 1000).toISOString()}`);
      console.log(`  Signature: ${event.signature}`);
      console.log(`  Block Time: ${new Date(event.blockTime * 1000).toISOString()}`);
      console.log(`  Slot: ${event.slot}`);
      console.log(`  Parsed At: ${new Date(event.parsedAt).toISOString()}`);
    });

    console.log('\n✅ 事件解析测试完成！');

  } catch (error) {
    console.error('❌ 事件解析测试失败:', error);
  }
}

// 运行测试
testEventParser(); 