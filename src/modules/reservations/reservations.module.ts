import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ReservationExpirationProcessor } from './processors/reservation-expiration.processor';

/**
 * ReservationsModule - Encapsulates reservation functionality
 *
 * Depends on DatabaseModule (already @Global) and RedisModule (already @Global)
 * Configura fila BullMQ para expiração automática de reservas
 */
@Module({
  imports: [
    // Registrar fila de expiração de reservas
    BullModule.registerQueue({
      name: 'reservation-expiration',
    }),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationExpirationProcessor],
  exports: [ReservationsService],
})
export class ReservationsModule {}
