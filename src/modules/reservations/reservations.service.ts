import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReservationsRepository } from '@/shared/database/repositories/reservations.repository';
import { SeatsRepository } from '@/shared/database/repositories/seats.repository';
import { SessionsRepository } from '@/shared/database/repositories/sessions.repository';
import { RedisService } from '@/shared/redis';
import { CreateReservationDto, ReservationResponseDto } from './dto';

/**
 * ReservationsService - Handles seat reservation business logic
 *
 * Implements distributed locking with Redis to prevent double-booking
 * Uses Repository Pattern for data access (Dependency Inversion)
 * Follows Single Responsibility: only reservation logic
 */
@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly RESERVATION_TTL_SECONDS = 30;
  private readonly LOCK_TTL_SECONDS = 10;

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create a new reservation with distributed locking
   *
   * Flow:
   * 1. Validate session exists
   * 2. Sort seat IDs (prevents deadlock)
   * 3. Acquire distributed locks on all seats
   * 4. Validate seats availability in database
   * 5. Create reservation with TTL
   * 6. Update seats status to 'reserved'
   * 7. Release locks
   *
   * @param dto - Reservation data
   * @returns Reservation details with expiration info
   */
  async create(
    dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const { sessionId, seatIds, userEmail, userId } = dto;

    this.logger.log(
      `Creating reservation for session ${sessionId} with ${seatIds.length} seats`,
    );

    // 1. Validate session exists
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // 2. Sort seat IDs to prevent deadlock
    const sortedSeatIds = [...seatIds].sort();

    // 3. Generate lock keys and unique lock value for seats in a specific session
    const lockKeys = sortedSeatIds.map((id) => `lock:session:${sessionId}:seat:${id}`);
    const lockValue = randomUUID();

    this.logger.debug(`Acquiring locks for seats: ${sortedSeatIds.join(', ')}`);

    try {
      // 4. Acquire distributed locks atomically
      const lockResult = await this.redisService.acquireMultipleLocks(
        lockKeys,
        lockValue,
        this.LOCK_TTL_SECONDS,
      );

      if (!lockResult.success) {
        this.logger.warn(
          `Failed to acquire lock for seat: ${lockResult.failedKey}`,
        );
        throw new ConflictException(
          'One or more seats are currently being reserved by another user. Please try again.',
        );
      }
      
      // Seats locked successfully, now i'll validate their availability
      try {
        // 5. Validate seats in database
        const seats = await this.seatsRepository.findByIds(sortedSeatIds);

        if (seats.length !== sortedSeatIds.length) {
          const foundIds = seats.map((s) => s.id);
          const missingIds = sortedSeatIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Seats not found: ${missingIds.join(', ')}`,
          );
        }

        // Validate all seats belong to the session
        const invalidSeats = seats.filter((s) => s.sessionId !== sessionId);
        if (invalidSeats.length > 0) {
          throw new BadRequestException(
            `Seats ${invalidSeats.map((s) => s.seatNumber).join(', ')} do not belong to session ${sessionId}`,
          );
        }

        // Validate all seats are available
        const unavailableSeats = seats.filter((s) => s.status !== 'available');
        if (unavailableSeats.length > 0) {
          throw new ConflictException(
            `Seats already reserved or sold: ${unavailableSeats.map((s) => s.seatNumber).join(', ')}`,
          );
        }

        // 6. Create reservation with TTL
        const expiresAt = new Date(
          Date.now() + this.RESERVATION_TTL_SECONDS * 1000,
        );

        const reservation = await this.reservationsRepository.create({
          sessionId,
          userId,
          userEmail,
          status: 'pending',
          expiresAt,
        });

        this.logger.log(`Created reservation ${reservation.id}`);

        // 7. Update seats status to 'reserved' and link to reservation
        await this.seatsRepository.updateManyStatus(
          sortedSeatIds,
          'reserved',
          reservation.id,
        );

        this.logger.log(
          `Updated ${sortedSeatIds.length} seats to reserved status`,
        );

        // 8. Cache reservation in Redis with TTL (for quick expiration check)
        await this.redisService.set(
          `reservation:${reservation.id}`,
          {
            id: reservation.id,
            sessionId,
            seatIds: sortedSeatIds,
            userEmail,
            status: 'pending',
            createdAt: reservation.createdAt,
            expiresAt,
          },
          this.RESERVATION_TTL_SECONDS,
        );

        // 9. Build response
        const remainingSeconds = Math.max(
          0,
          Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        );

        return {
          id: reservation.id,
          sessionId: reservation.sessionId,
          seatIds: sortedSeatIds,
          seatNumbers: seats.map((s) => s.seatNumber),
          userEmail: reservation.userEmail,
          status: reservation.status,
          createdAt: reservation.createdAt,
          expiresAt: reservation.expiresAt,
          remainingSeconds,
        };
      } finally {
        // 10. Always release locks (even if operation failed)
        const released = await this.redisService.releaseMultipleLocks(
          lockKeys,
          lockValue,
        );
        this.logger.debug(`Released ${released} locks`);
      }
    } catch (error) {
      this.logger.error('Failed to create reservation:', error.stack);
      throw error;
    }
  }

  /**
   * Get reservation by ID
   *
   * @param id - Reservation ID
   * @returns Reservation details with remaining time
   */
  async findOne(id: string): Promise<ReservationResponseDto> {
    this.logger.log(`Finding reservation ${id}`);

    // Try cache first
    const cached = await this.redisService.get<{
      id: string;
      sessionId: string;
      seatIds: string[];
      userEmail: string;
      status: string;
      createdAt: Date;
      expiresAt: Date;
    }>(`reservation:${id}`);

    if (cached) {
      const seats = await this.seatsRepository.findByIds(cached.seatIds);
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(cached.expiresAt).getTime() - Date.now()) / 1000),
      );

      return {
        ...cached,
        seatNumbers: seats.map((s) => s.seatNumber),
        expiresAt: new Date(cached.expiresAt),
        remainingSeconds,
      };
    }

    // Fallback to database
    const reservation = await this.reservationsRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    const seats = await this.seatsRepository.findByReservationId(id);
    const remainingSeconds = Math.max(
      0,
      Math.floor((reservation.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      id: reservation.id,
      sessionId: reservation.sessionId,
      seatIds: seats.map((s) => s.id),
      seatNumbers: seats.map((s) => s.seatNumber),
      userEmail: reservation.userEmail,
      status: reservation.status,
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt,
      remainingSeconds,
    };
  }

  /**
   * Cancel a reservation
   *
   * Releases seats back to available status
   * @param id - Reservation ID
   */
  async cancel(id: string): Promise<void> {
    this.logger.log(`Cancelling reservation ${id}`);

    const reservation = await this.reservationsRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        `Cannot cancel reservation with status: ${reservation.status}`,
      );
    }

    // Update reservation status
    await this.reservationsRepository.updateStatus(id, 'cancelled');

    // Release seats back to available
    const seats = await this.seatsRepository.findByReservationId(id);
    const seatIds = seats.map((s) => s.id);

    await this.seatsRepository.updateManyStatus(seatIds, 'available', null);

    // Remove from cache
    await this.redisService.del(`reservation:${id}`);

    this.logger.log(`Reservation ${id} cancelled, ${seatIds.length} seats released`);
  }

  /**
   * Process expired reservations (cron job)
   *
   * Finds and cancels all expired pending reservations
   * Releases seats back to available status
   */
  async processExpiredReservations(): Promise<number> {
    this.logger.log('Processing expired reservations');

    const expiredReservations =
      await this.reservationsRepository.findExpired();

    for (const reservation of expiredReservations) {
      try {
        // Update reservation to expired
        await this.reservationsRepository.updateStatus(reservation.id, 'expired');

        // Release seats
        const seats = await this.seatsRepository.findByReservationId(
          reservation.id,
        );
        const seatIds = seats.map((s) => s.id);

        await this.seatsRepository.updateManyStatus(seatIds, 'available', null);

        this.logger.log(
          `Expired reservation ${reservation.id}, released ${seatIds.length} seats`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process expired reservation ${reservation.id}:`,
          error,
        );
      }
    }

    this.logger.log(`Processed ${expiredReservations.length} expired reservations`);
    return expiredReservations.length;
  }
}
