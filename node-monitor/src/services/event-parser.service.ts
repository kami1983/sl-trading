import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { 
  TradeEvent, 
  getTradeEventDecoder 
} from '../generated/types';
import { SL_TRADING_PROGRAM_ADDRESS } from '../generated/programs/slTrading';
import { createHash } from 'crypto';
import { EventRegistryService } from './event-registry.service';

function anchorEventDiscriminator(eventName: string): Buffer {
  return createHash('sha256').update(`event:${eventName}`).digest().subarray(0, 8);
}

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
  private readonly tradeEventDiscriminator: Buffer;

  constructor(private readonly registry: EventRegistryService) {
    const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
    const program = process.env.PROGRAM_ADDRESS || SL_TRADING_PROGRAM_ADDRESS;
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programAddress = new PublicKey(program);
    this.tradeEventDiscriminator = anchorEventDiscriminator('TradeEvent');
  }

  async parseTradeEventsFromTransaction(
    transactionResponse: TransactionResponse,
    signature: string,
    blockTime?: number
  ): Promise<ParsedTradeEvent[]> {
    const parsed: ParsedTradeEvent[] = [];

    try {
      const logs = transactionResponse?.meta?.logMessages as unknown as string[] | undefined;
      if (!logs?.length) {
        this.logger.debug('交易无日志消息');
        return parsed;
      }

      this.logger.debug(`解析交易日志，共 ${logs.length} 条日志`);

      if (!this.isSlTradingTransaction(logs)) {
        this.logger.debug('非SL Trading交易，跳过');
        return parsed;
      }

      const events = this.parseAnchorEventsFromLogs(logs, signature, transactionResponse.slot, blockTime);
      parsed.push(...events);

      this.logger.debug(`解析结果: ${parsed.length} 个事件`);
    } catch (error) {
      this.logger.error('解析交易事件失败:', error as any);
    }

    return parsed;
  }

  private isSlTradingTransaction(logMessages: string[]): boolean {
    return logMessages.some((log) =>
      log.includes(`Program ${this.programAddress.toString()} invoke`) ||
      log.startsWith('Program data: '),
    );
  }

  private parseAnchorEventsFromLogs(
    logs: string[],
    signature: string,
    slot: number,
    blockTime?: number,
  ): ParsedTradeEvent[] {
    const out: ParsedTradeEvent[] = [];

    for (const log of logs) {
      if (!log.startsWith('Program data: ')) continue;
      try {
        const dataBase64 = log.substring('Program data: '.length);
        const data = Buffer.from(dataBase64, 'base64');
        if (data.length < 8) continue;

        const disc = data.subarray(0, 8);
        const discHex = Buffer.from(disc).toString('hex');
        const reg = this.registry.get(discHex);
        if (!reg) continue; // 未注册的事件，忽略

        const decoded: any = reg.decode(data.subarray(8));

        // 仅当是 TradeEvent 时提升为强类型，其他事件可按需扩展
        if (disc.equals(this.tradeEventDiscriminator)) {
          const finalTimestamp: bigint = BigInt(blockTime ?? Math.floor(Date.now() / 1000));
          const event: ParsedTradeEvent = {
            ...(decoded as TradeEvent),
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
          out.push(event);
        } else {
          // 其他事件：目前仅记录存在，后续可扩展存储/映射
          this.logger.debug(`解析到其他事件: ${reg.name}`);
        }
      } catch {
        this.logger.warn('Program data 解码失败，已跳过该日志');
      }
    }

    return out;
  }

  getProgramAddress(): PublicKey {
    return this.programAddress;
  }

  getConnection(): Connection {
    return this.connection;
  }
} 