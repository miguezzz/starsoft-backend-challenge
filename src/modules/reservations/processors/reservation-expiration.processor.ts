import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  ReservationsRepository,
  SeatsRepository,
} from '@/shared/database';

/**
 * ReservationExpirationProcessor
 *
 * Processa jobs de expiração de reservas após 30 segundos
 * Executado automaticamente pelo BullMQ quando o delay expira
 */
@Processor('reservation-expiration', {
  concurrency: 5, // Processar até 5 jobs simultâneos
})
export class ReservationExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationExpirationProcessor.name);

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly seatsRepository: SeatsRepository,
  ) {
    super();
  }

  /**
   * Processa job de expiração de reserva
   *
   * @param job - Job com dados da reserva
   */
  async process(job: Job<{ reservationId: string }>): Promise<void> {
    const { reservationId } = job.data;

    this.logger.log(
      `Processing expiration for reservation ${reservationId} (Job ID: ${job.id})`,
    );

    try {
      // 1. Buscar reserva
      const reservation =
        await this.reservationsRepository.findById(reservationId);

      if (!reservation) {
        this.logger.warn(
          `Reservation ${reservationId} not found, probably already processed`,
        );
        return;
      }

      // 2. Verificar se ainda está pending (pode ter sido confirmada)
      if (reservation.status !== 'pending') {
        this.logger.log(
          `Reservation ${reservationId} status is ${reservation.status}, skipping expiration`,
        );
        return;
      }

      // 3. Verificar se realmente expirou (dupla checagem)
      const now = new Date();
      if (reservation.expiresAt > now) {
        this.logger.warn(
          `Reservation ${reservationId} has not expired yet, rescheduling`,
        );
        // Pode acontecer se o clock do sistema mudou
        return;
      }

      // 4. Atualizar status da reserva para 'expired'
      await this.reservationsRepository.updateStatus(reservationId, 'expired');

      // 5. Liberar assentos de volta para 'available'
      const seats =
        await this.seatsRepository.findByReservationId(reservationId);
      const seatIds = seats.map((s) => s.id);

      if (seatIds.length > 0) {
        await this.seatsRepository.updateManyStatus(
          seatIds,
          'available',
          null,
        );
      }

      this.logger.log(
        `Expired reservation ${reservationId}, released ${seatIds.length} seats: ${seats.map((s) => s.seatNumber).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process expiration for reservation ${reservationId}: ${error.message}`,
        error.stack,
      );
      // Relançar erro para BullMQ tentar novamente (retry automático)
      throw error;
    }
  }
}
