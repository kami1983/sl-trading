import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventParserService } from './services/event-parser.service';
import { CacheService } from './services/cache.service';
import { AutoMonitorService } from './services/auto-monitor.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, EventParserService, CacheService, AutoMonitorService],
})
export class AppModule {}
