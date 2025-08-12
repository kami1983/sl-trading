import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { EventParserService, ParsedTradeEvent } from './event-parser.service';
import { CacheService } from './cache.service';

@Injectable()
export class AutoMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoMonitorService.name);

  private intervalHandle?: NodeJS.Timeout;
  private connection: Connection;
  private program: PublicKey;

  private readonly rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  private readonly programAddress = process.env.PROGRAM_ADDRESS || 'EAJ7QiDXgXH31m57RhDFMHTkBrDzxrFpcN8xUkPUqHLi';
  private readonly intervalMs = parseInt(process.env.MONITOR_INTERVAL_SECONDS || '60') * 1000;
  private readonly batchSize = parseInt(process.env.BATCH_SIZE || '50');

  constructor(
    private readonly parser: EventParserService,
    private readonly cache: CacheService,
  ) {
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    this.program = new PublicKey(this.programAddress);
  }

  async onModuleInit(): Promise<void> {
    await this.cache.initialize();
    this.logger.log(`自动监控启动，每 ${this.intervalMs / 1000}s 抓取一次`);

    // 立即执行一次
    await this.tick();

    // 周期执行
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    await this.cache.save();
  }

  private async tick(): Promise<void> {
    const start = Date.now();
    try {
      const before = this.cache.getLastSignature();
      const signatures = await this.connection.getSignaturesForAddress(this.program, {
        limit: this.batchSize,
        before,
      });

      if (!signatures.length) {
        this.logger.log('无新签名');
        return;
      }

      // 解析交易
      const allEvents: ParsedTradeEvent[] = [];
      for (const sig of signatures) {
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          if (!tx) continue;

          const events = await this.parser.parseTradeEventsFromTransaction(
            tx as any,
            sig.signature,
            sig.blockTime || undefined,
          );
          allEvents.push(...events);
        } catch (e) {
          this.logger.warn(`解析交易失败 ${sig.signature}: ${e}`);
        }
      }

      // 写入缓存
      const added = await this.cache.addEvents(
        allEvents.map((e) => ({
          signature: e.signature,
          blockTime: e.blockTime,
          slot: e.slot,
          id: e.id,
          userId: e.userId,
          fundId: e.fundId,
          tradeType: Number(e.tradeType),
          amount: e.amount,
          price: e.price,
          timestamp: e.timestamp,
          parsedAt: e.parsedAt,
        })),
      );

      // 更新 lastSignature 为最新一条
      this.cache.setLastSignature(signatures[0].signature);

      const ms = Date.now() - start;
      this.logger.log(`抓取完成，新增事件 ${added} 个（耗时 ${ms}ms）`);
    } catch (error) {
      this.logger.error(`抓取失败: ${error}`);
    }
  }
}