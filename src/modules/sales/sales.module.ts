import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@/shared/database';
import { RedisModule } from '@/shared/redis';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    // Import queue for cancelling expiration jobs
    BullModule.registerQueue({
      name: 'reservation-expiration',
    }),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}