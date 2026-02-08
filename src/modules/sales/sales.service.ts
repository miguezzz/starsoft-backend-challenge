import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ReservationsRepository,
  SalesRepository,
  SeatsRepository,
  SessionsRepository,
} from '@/shared/database';
import { RedisService } from '@/shared/redis';
import { CreateSaleDto, SaleResponseDto } from './dto';

/**
 * SalesService - Handles payment confirmation and sale finalization
 *
 * Converts pending reservations into confirmed sales
 * Cancels scheduled expiration job when payment is confirmed
 * Updates seat status and removes reservation from cache
 * Follows Single Responsibility: only sale logic
 */
@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly reservationsRepository: ReservationsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly redisService: RedisService,
    @InjectQueue('reservation-expiration')
    private readonly expirationQueue: Queue,
  ) {}

  /**
   * Create a sale by confirming a reservation
   *
   * Flow:
   * 1. Validate reservation exists and is pending
   * 2. Check if reservation has not expired
   * 3. Get seats and calculate total price
   * 4. Create sale record
   * 5. Update reservation status to confirmed
   * 6. Update seats status to sold
   * 7. Remove reservation from cache
   * 8. Cancel scheduled expiration job
   *
   * @param dto - Sale creation data
   * @returns Sale details
   */
  async create(dto: CreateSaleDto): Promise<SaleResponseDto> {
    const { reservationId } = dto;

    this.logger.log(`Creating sale for reservation ${reservationId}`);

    // 1. Validate reservation exists
    const reservation =
      await this.reservationsRepository.findById(reservationId);

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with ID ${reservationId} not found`,
      );
    }

    // 2. Validate reservation is still pending
    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        `Cannot create sale for reservation with status: ${reservation.status}`,
      );
    }

    // 3. Check if reservation has expired
    const now = new Date();
    if (reservation.expiresAt < now) {
      // Update reservation to expired
      await this.reservationsRepository.updateStatus(reservationId, 'expired');

      throw new BadRequestException(
        'Reservation has expired. Please create a new reservation.',
      );
    }

    // 4. Get seats for this reservation
    const seats =
      await this.seatsRepository.findByReservationId(reservationId);

    if (seats.length === 0) {
      throw new NotFoundException('No seats found for this reservation');
    }

    const seatIds = seats.map((s) => s.id);

    // 5. Get session to calculate price
    const session = await this.sessionsRepository.findById(
      reservation.sessionId,
    );

    if (!session) {
      throw new NotFoundException(
        `Session with ID ${reservation.sessionId} not found`,
      );
    }

    // 6. Calculate total price
    const ticketPrice = parseFloat(session.ticketPrice);
    const totalPrice = ticketPrice * seats.length;

    // 7. Create sale record
    const sale = await this.salesRepository.create({
      reservationId,
      userId: reservation.userId,
      userEmail: reservation.userEmail,
      sessionId: reservation.sessionId,
      amount: totalPrice.toFixed(2),
    });

    this.logger.log(`Created sale ${sale.id} for ${seats.length} seats`);

    // 8. Update reservation status to confirmed
    await this.reservationsRepository.updateStatus(reservationId, 'confirmed');

    // 9. Update seats status to sold
    await this.seatsRepository.updateManyStatus(seatIds, 'sold', reservationId);

    this.logger.log(
      `Updated ${seatIds.length} seats to sold status for sale ${sale.id}`,
    );

    // 10. Remove reservation from cache
    await this.redisService.del(`reservation:${reservationId}`);

    // 11. Cancel scheduled expiration job (payment confirmed, no need to expire)
    try {
      const job = await this.expirationQueue.getJob(`reservation-${reservationId}`);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled expiration job for reservation ${reservationId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cancel expiration job for reservation ${reservationId}: ${error.message}`,
      );
    }

    // 12. Build response
    return {
      id: sale.id,
      reservationId: sale.reservationId,
      sessionId: sale.sessionId,
      seatIds,
      seatNumbers: seats.map((s) => s.seatNumber),
      userEmail: sale.userEmail,
      amount: sale.amount,
      createdAt: sale.createdAt,
    };
  }

  /**
   * Get sale by ID
   *
   * @param id - Sale ID
   * @returns Sale details
   */
  async findOne(id: string): Promise<SaleResponseDto> {
    this.logger.log(`Finding sale ${id}`);

    const sale = await this.salesRepository.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    // Get seats for this sale
    const seats = await this.seatsRepository.findByReservationId(
      sale.reservationId,
    );

    return {
      id: sale.id,
      reservationId: sale.reservationId,
      sessionId: sale.sessionId,
      seatIds: seats.map((s) => s.id),
      seatNumbers: seats.map((s) => s.seatNumber),
      userEmail: sale.userEmail,
      amount: sale.amount,
      createdAt: sale.createdAt,
    };
  }

  /**
   * Get all sales for a user
   *
   * @param userId - User ID
   * @returns List of sales
   */
  async findByUser(userId: string): Promise<SaleResponseDto[]> {
    this.logger.log(`Finding sales for user ${userId}`);

    const sales = await this.salesRepository.findByUserId(userId);

    // Map each sale to response DTO
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        const seats = await this.seatsRepository.findByReservationId(
          sale.reservationId,
        );

        return {
          id: sale.id,
          reservationId: sale.reservationId,
          sessionId: sale.sessionId,
          seatIds: seats.map((s) => s.id),
          seatNumbers: seats.map((s) => s.seatNumber),
          userEmail: sale.userEmail,
          amount: sale.amount,
          createdAt: sale.createdAt,
        };
      }),
    );

    return salesWithDetails;
  }
}