import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { 
  TradeEvent, 
  TradeType, 
  getTradeEventDecoder 
} from '../generated/types';

export interface ParsedTradeEvent extends TradeEvent {
  signature: string;
  blockTime: number;
  slot: number;
  parsedAt: number;
}

@Injectable()
export class EventParserService {
  private readonly logger = new Logger(EventParserService.name);
  private readonly connection: Connection;
  private readonly programAddress: PublicKey;
  
  // TradeEvent 的 discriminator (前8字节)
  private static readonly TRADE_EVENT_DISCRIMINATOR = Buffer.from([
    189, 219, 127, 211, 78, 230, 97, 238
  ]);

  constructor() {
    const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
    const program = process.env.PROGRAM_ADDRESS || 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programAddress = new PublicKey(program);
  }

  /**
   * 从交易响应中解析 TradeEvent 数据
   */
  async parseTradeEventsFromTransaction(
    transactionResponse: TransactionResponse,
    signature: string,
    blockTime?: number
  ): Promise<ParsedTradeEvent[]> {
    const events: ParsedTradeEvent[] = [];

    try {
      if (!transactionResponse?.meta?.logMessages) {
        this.logger.debug('交易无日志消息');
        return events;
      }

      const logMessages = transactionResponse.meta.logMessages as unknown as string[];
      this.logger.debug(`解析交易日志，共 ${logMessages.length} 条日志`);

      // 检查是否是 SL Trading 相关的交易
      const isSlTradingTransaction = this.isSlTradingTransaction(logMessages);
      if (!isSlTradingTransaction) {
        this.logger.debug('非SL Trading交易，跳过');
        return events;
      }

      this.logger.debug('确认为SL Trading交易，开始解析事件');

      // 解析 Anchor 事件数据
      const anchorEvents = this.parseAnchorEventsFromLogs(
        logMessages, 
        signature, 
        transactionResponse.slot,
        blockTime
      );
      events.push(...anchorEvents);

      this.logger.debug(`解析结果: ${events.length} 个事件`);

    } catch (error) {
      this.logger.error('解析交易事件失败:', error as any);
    }

    return events;
  }

  /**
   * 检查是否是 SL Trading 相关的交易
   */
  private isSlTradingTransaction(logMessages: string[]): boolean {
    return logMessages.some(log => 
      log.includes(`Program ${this.programAddress.toString()} invoke`) ||
      log.includes('Trade event emitted') ||
      log.startsWith('Program data: ')
    );
  }

  /**
   * 从日志中解析 Anchor 事件
   */
  private parseAnchorEventsFromLogs(
    logs: string[], 
    signature: string,
    slot: number,
    blockTime?: number
  ): ParsedTradeEvent[] {
    const events: ParsedTradeEvent[] = [];

    for (const log of logs) {
      try {
        // 查找包含 Program data 的日志
        if (log.startsWith('Program data: ')) {
          const dataBase64 = log.substring('Program data: '.length);
          const data = Buffer.from(dataBase64, 'base64');

          // 检查事件标识符 (前8字节)
          if (data.length < 8) {
            continue;
          }

          const eventDiscriminator = data.slice(0, 8);

          if (eventDiscriminator.equals(EventParserService.TRADE_EVENT_DISCRIMINATOR)) {
            this.logger.debug('找到 TradeEvent 数据，开始解析...');

            try {
              // 使用生成的解码器解析事件数据 (跳过前8字节 discriminator)
              const decoder = getTradeEventDecoder();
              const decodedEvent = decoder.decode(data.subarray(8));

              // 处理时间戳：使用区块时间而不是事件中的时间戳
              const finalTimestamp: bigint = BigInt(
                blockTime ?? Math.floor(Date.now() / 1000),
              );

              const event: ParsedTradeEvent = {
                ...decodedEvent,
                timestamp: finalTimestamp,
                signature,
                blockTime: blockTime || Math.floor(Date.now() / 1000),
                slot,
                parsedAt: Date.now()
              };

              this.logger.debug('解析成功:', {
                id: event.id,
                userId: event.userId,
                fundId: event.fundId,
                tradeType: event.tradeType,
                amount: event.amount.toString(),
                price: event.price.toString()
              } as any);

              events.push(event);

            } catch (parseError) {
              this.logger.warn('生成解码器解析失败:', parseError as any);
              
              // 回退到基本事件
              const event: ParsedTradeEvent = {
                id: `failed-parse-${Date.now()}`,
                userId: 'parse-error',
                fundId: 'parse-error',
                tradeType: TradeType.BUY,
                amount: BigInt(0),
                price: BigInt(0),
                timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)),
                signature,
                blockTime: blockTime || Math.floor(Date.now() / 1000),
                slot,
                parsedAt: Date.now()
              };
              events.push(event);
            }
          }
        }
      } catch (error) {
        this.logger.warn('解析事件时出错:', error as any);
      }
    }

    // 如果没有找到事件，也尝试从普通日志解析
    if (events.length === 0) {
      for (const log of logs) {
        if (log.includes('Trade event emitted')) {
          this.logger.debug('从日志消息解析事件:', log);

          // 解析格式: "Trade event emitted - ID: xxx, Type: xxx, Amount: xxx, Price: xxx"
          const idMatch = log.match(/ID: ([^,]+)/);
          const typeMatch = log.match(/Type: (BUY|SELL)/);
          const amountMatch = log.match(/Amount: (\d+)/);
          const priceMatch = log.match(/Price: (\d+)/);

          if (idMatch && typeMatch && amountMatch && priceMatch) {
            const event: ParsedTradeEvent = {
              id: idMatch[1].trim(),
              userId: 'parsed-from-log',
              fundId: 'parsed-from-log',
              tradeType: typeMatch[1] === 'BUY' ? TradeType.BUY : TradeType.SELL,
              amount: BigInt(amountMatch[1]),
              price: BigInt(priceMatch[1]),
              timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)),
              signature,
              blockTime: blockTime || Math.floor(Date.now() / 1000),
              slot,
              parsedAt: Date.now()
            };

            this.logger.debug('解析到真实交易数据:', event as any);
            events.push(event);
          } else {
            this.logger.debug('无法解析日志格式');
          }
          break;
        }
      }
    }

    return events;
  }

  /**
   * 获取程序地址
   */
  getProgramAddress(): PublicKey {
    return this.programAddress;
  }

  /**
   * 获取连接
   */
  getConnection(): Connection {
    return this.connection;
  }
} 