import { Injectable, Logger } from '@nestjs/common';
import fs from 'fs/promises';
import path from 'path';

export interface TradeEventData {
  signature: string;
  blockTime: number;
  slot: number;
  id: string;
  userId: string;
  fundId: string;
  tradeType: number; // 0=BUY, 1=SELL
  amount: bigint;
  price: bigint;
  timestamp: bigint;
  parsedAt: number;
}

export interface CacheData {
  lastUpdate: number;
  lastSignature?: string;
  events: TradeEventData[];
  totalEvents: number;
  monitorStartTime: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  private cacheDir = process.env.CACHE_DIR || './cache';
  private cacheFile = path.join(this.cacheDir, process.env.CACHE_FILE || 'trading-events.json');
  private logFile = path.join(this.cacheDir, process.env.LOG_FILE || 'monitor.log');

  private cache: CacheData = {
    lastUpdate: 0,
    events: [],
    totalEvents: 0,
    monitorStartTime: Date.now(),
  };

  async initialize(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await this.loadCache();
    this.logger.log('缓存服务已初始化');
  }

  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      this.cache = JSON.parse(data, (key, value) => {
        if (typeof value === 'string' && /^\d+n$/.test(value)) {
          return BigInt(value.slice(0, -1));
        }
        return value;
      });

      // 去重（按签名）
      const unique = new Map<string, TradeEventData>();
      for (const ev of this.cache.events) {
        if (!unique.has(ev.signature)) unique.set(ev.signature, ev);
      }
      this.cache.events = Array.from(unique.values());
    } catch {
      this.logger.log('未发现缓存文件，将创建新的缓存');
    }
  }

  async save(): Promise<void> {
    const data = JSON.stringify(
      this.cache,
      (key, value) => (typeof value === 'bigint' ? value.toString() + 'n' : value),
      2,
    );
    await fs.writeFile(this.cacheFile, data);
  }

  async addEvents(newEvents: TradeEventData[]): Promise<number> {
    if (!newEvents?.length) return 0;

    const existing = new Set(this.cache.events.map((e) => e.signature));
    const unique = newEvents.filter((e) => !existing.has(e.signature));

    if (unique.length === 0) return 0;

    this.cache.events.unshift(...unique);
    this.cache.totalEvents += unique.length;
    this.cache.lastUpdate = Date.now();

    const maxCache = parseInt(process.env.MAX_CACHE_EVENTS || '1000');
    if (this.cache.events.length > maxCache) {
      this.cache.events = this.cache.events.slice(0, maxCache);
    }

    await this.save();
    return unique.length;
  }

  setLastSignature(sig?: string): void {
    this.cache.lastSignature = sig;
  }

  getLastSignature(): string | undefined {
    return this.cache.lastSignature;
  }

  getStats(): { total: number; current: number; lastUpdate: number; lastSignature?: string } {
    return {
      total: this.cache.totalEvents,
      current: this.cache.events.length,
      lastUpdate: this.cache.lastUpdate,
      lastSignature: this.cache.lastSignature,
    };
  }
}