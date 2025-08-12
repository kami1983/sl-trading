import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { 
  TradeEvent, 
  TradeType, 
  getTradeEventDecoder 
} from '../generated/types';
import { SL_TRADING_PROGRAM_ADDRESS } from '../generated/programs/slTrading';

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
    // 优先环境变量，其次使用生成代码的常量
    const program = process.env.PROGRAM_ADDRESS || SL_TRADING_PROGRAM_ADDRESS;
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

      // 检查是否是 SL Trading 相关的交易（保持启发式，若需更严谨可结合指令表校验）
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
      log.startsWith('Program data: ')
    );
  }

  /**
   * 从日志中解析 Anchor 事件（仅依赖 Program data + 生成的解码器）
   */
  private parseAnchorEventsFromLogs(
    logs: string[], 
    signature: string,
    slot: number,
    blockTime?: number
  ): ParsedTradeEvent[] {
    const events: ParsedTradeEvent[] = [];
    const decoder = getTradeEventDecoder();

    for (const log of logs) {
      if (!log.startsWith('Program data: ')) continue;

      try {
        const dataBase64 = log.substring('Program data: '.length);
        const data = Buffer.from(dataBase64, 'base64');
        if (data.length < 8) continue;

        // 可选：先校验 discriminator，再解码
        const eventDiscriminator = data.slice(0, 8);
        if (!eventDiscriminator.equals(EventParserService.TRADE_EVENT_DISCRIMINATOR)) {
          continue;
        }

        const decodedEvent = decoder.decode(data.subarray(8));

        const finalTimestamp: bigint = BigInt(
          blockTime ?? Math.floor(Date.now() / 1000),
        );

        const event: ParsedTradeEvent = {
          ...decodedEvent,
          timestamp: finalTimestamp,
          signature,
          blockTime: blockTime || Math.floor(Date.now() / 1000),
          slot,
          parsedAt: Date.now(),
        };

        this.logger.debug('解析成功:', {
          id: event.id,
          userId: event.userId,
          fundId: event.fundId,
          tradeType: event.tradeType,
          amount: event.amount.toString(),
          price: event.price.toString(),
        } as any);

        events.push(event);
      } catch (error) {
        // 解码失败直接忽略该条日志（不做文案兜底，不写入占位事件）
        this.logger.warn('Program data 解码失败，已跳过该日志');
        continue;
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