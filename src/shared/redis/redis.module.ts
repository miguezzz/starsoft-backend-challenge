import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule - Global module providing Redis functionality
 *
 * Marked as @Global to avoid importing in every module
 * Provides distributed locking for concurrency control
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
