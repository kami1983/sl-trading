import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { getTradeEventDecoder } from '../generated/types';

export type DiscriminatorHex = string; // 8 bytes hex, e.g. "bddb7fd34ee661ee"

export interface RegisteredEvent {
  name: string;
  decode: (dataWithoutDisc: Uint8Array) => any;
}

function anchorEventDiscriminatorHex(eventName: string): DiscriminatorHex {
  const disc = createHash('sha256').update(`event:${eventName}`).digest().subarray(0, 8);
  return Buffer.from(disc).toString('hex');
}

@Injectable()
export class EventRegistryService {
  private readonly registry = new Map<DiscriminatorHex, RegisteredEvent>();

  constructor() {
    // 注册 TradeEvent
    this.register(
      anchorEventDiscriminatorHex('TradeEvent'),
      {
        name: 'TradeEvent',
        decode: (data) => getTradeEventDecoder().decode(data),
      },
    );
  }

  register(discriminatorHex: DiscriminatorHex, def: RegisteredEvent): void {
    this.registry.set(discriminatorHex, def);
  }

  get(discriminatorHex: DiscriminatorHex): RegisteredEvent | undefined {
    return this.registry.get(discriminatorHex);
  }

  has(discriminatorHex: DiscriminatorHex): boolean {
    return this.registry.has(discriminatorHex);
  }
}