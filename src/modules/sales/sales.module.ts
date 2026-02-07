import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/shared/database';
import { RedisModule } from '@/shared/redis';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}