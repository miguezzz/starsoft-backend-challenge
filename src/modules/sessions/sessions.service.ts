import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SessionsRepository, SeatsRepository, seats } from '@/shared/database';
import { CreateSessionDto, UpdateSessionDto, SessionResponseDto, SeatResponseDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly seatsRepository: SeatsRepository,
  ) {}

  async create(
    createSessionDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `Creating session: ${createSessionDto.movieName} at ${createSessionDto.startTime}`,
    );

    // Validar que startTime é antes de endTime
    const start = new Date(createSessionDto.startTime);
    const end = new Date(createSessionDto.endTime);

    if (start >= end) {
      throw new BadRequestException(
        'Start time must be before end time',
      );
    }

    // Validar que a sessão não é no passado
    if (start < new Date()) {
      throw new BadRequestException(
        'Cannot create session in the past',
      );
    }

    try {
      // Criar a sessão
      const session = await this.sessionsRepository.create({
        movieName: createSessionDto.movieName,
        roomNumber: createSessionDto.roomNumber,
        startTime: start,
        endTime: end,
        ticketPrice: createSessionDto.ticketPrice.toString(),
      });

      // Criar os assentos automaticamente
      const seats = this.generateSeats(
        session.id,
        createSessionDto.totalSeats,
      );
      await this.seatsRepository.createMany(seats);

      this.logger.log(
        `Session created successfully: ${session.id} with ${createSessionDto.totalSeats} seats`,
      );

      return {
        id: session.id,
        movieName: session.movieName,
        roomNumber: session.roomNumber,
        startTime: session.startTime,
        endTime: session.endTime,
        ticketPrice: session.ticketPrice,
        totalSeats: createSessionDto.totalSeats,
        availableSeats: createSessionDto.totalSeats,
        createdAt: session.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<SessionResponseDto[]> {
    this.logger.log('Fetching all sessions');

    const sessions = await this.sessionsRepository.findAll();

    // Para cada sessão, buscar quantidade de assentos disponíveis
    const sessionsWithSeats = await Promise.all(
      sessions.map(async (session) => {
        const seats = await this.seatsRepository.findBySessionId(session.id);
        const availableSeats = seats.filter(
          (seat) => seat.status === 'available',
        ).length;

        return {
          id: session.id,
          movieName: session.movieName,
          roomNumber: session.roomNumber,
          startTime: session.startTime,
          endTime: session.endTime,
          ticketPrice: session.ticketPrice,
          totalSeats: seats.length,
          availableSeats,
          createdAt: session.createdAt,
        };
      }),
    );

    return sessionsWithSeats;
  }

  async findOne(id: string): Promise<SessionResponseDto> {
    this.logger.log(`Fetching session: ${id}`);

    const session = await this.sessionsRepository.findById(id);

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    const seats = await this.seatsRepository.findBySessionId(id);
    const availableSeats = seats.filter(
      (seat) => seat.status === 'available',
    ).length;

    return {
      id: session.id,
      movieName: session.movieName,
      roomNumber: session.roomNumber,
      startTime: session.startTime,
      endTime: session.endTime,
      ticketPrice: session.ticketPrice,
      totalSeats: seats.length,
      availableSeats,
      createdAt: session.createdAt,
    };
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(`Updating session: ${id}`);

    const session = await this.sessionsRepository.findById(id);

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    // Validar datas se fornecidas
    if (updateSessionDto.startTime && updateSessionDto.endTime) {
      const start = new Date(updateSessionDto.startTime);
      const end = new Date(updateSessionDto.endTime);

      if (start >= end) {
        throw new BadRequestException(
          'Start time must be before end time',
        );
      }
    }

    try {
      const updatedSession = await this.sessionsRepository.update(id, {
        ...updateSessionDto,
        startTime: updateSessionDto.startTime
          ? new Date(updateSessionDto.startTime)
          : undefined,
        endTime: updateSessionDto.endTime
          ? new Date(updateSessionDto.endTime)
          : undefined,
        ticketPrice: updateSessionDto.ticketPrice?.toString(),
      });

      const seats = await this.seatsRepository.findBySessionId(id);
      const availableSeats = seats.filter(
        (seat) => seat.status === 'available',
      ).length;

      this.logger.log(`Session updated successfully: ${id}`);

      return {
        id: updatedSession.id,
        movieName: updatedSession.movieName,
        roomNumber: updatedSession.roomNumber,
        startTime: updatedSession.startTime,
        endTime: updatedSession.endTime,
        ticketPrice: updatedSession.ticketPrice,
        totalSeats: seats.length,
        availableSeats,
        createdAt: updatedSession.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting session: ${id}`);

    const session = await this.sessionsRepository.findById(id);

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    try {
      await this.sessionsRepository.delete(id);
      this.logger.log(`Session deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSeats(sessionId: string): Promise<SeatResponseDto[]> {
    this.logger.log(`Fetching seats for session: ${sessionId}`);

    // Verificar se a sessão existe
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Buscar assentos da sessão
    const seats = await this.seatsRepository.findBySessionId(sessionId);

    return seats.map((seat) => ({
      id: seat.id,
      sessionId: seat.sessionId,
      seatNumber: seat.seatNumber,
      status: seat.status as 'available' | 'reserved' | 'sold',
      reservationId: seat.reservationId,
      createdAt: seat.createdAt,
      updatedAt: seat.updatedAt,
    }));
  }

  /**
   * Gera assentos automaticamente no formato A1, A2, B1, B2, etc.
   */
  private generateSeats(sessionId: string, totalSeats: number): Array<typeof seats.$inferInsert> {
    const seatsList: Array<typeof seats.$inferInsert> = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = Math.ceil(totalSeats / rows.length);

    let seatCount = 0;

    for (const row of rows) {
      for (let col = 1; col <= seatsPerRow && seatCount < totalSeats; col++) {
        seatsList.push({
          sessionId,
          seatNumber: `${row}${col}`,
          status: 'available' as const,
        });
        seatCount++;
      }

      if (seatCount >= totalSeats) break;
    }

    return seatsList;
  }
}
