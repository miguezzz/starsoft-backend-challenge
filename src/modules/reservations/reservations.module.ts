import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';

/**
 * ReservationsModule - Encapsulates reservation functionality
 *
 * Depends on DatabaseModule (already @Global) and RedisModule (already @Global)
 * No need to import them explicitly thanks to @Global decorator
 */
@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
