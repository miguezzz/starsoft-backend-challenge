import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from '@/shared/database/repositories/reservations.repository';
import { SeatsRepository } from '@/shared/database/repositories/seats.repository';
import { SessionsRepository } from '@/shared/database/repositories/sessions.repository';
import { RedisService } from '@/shared/redis';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepository: jest.Mocked<ReservationsRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let redisService: jest.Mocked<RedisService>;

  const mockReservationsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findExpired: jest.fn(),
    updateStatus: jest.fn(),
    findByUserId: jest.fn(),
  };

  const mockSeatsRepository = {
    findByIds: jest.fn(),
    findBySessionId: jest.fn(),
    findByReservationId: jest.fn(),
    updateManyStatus: jest.fn(),
    findAvailableBySessionId: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    findById: jest.fn(),
  };

  const mockSessionsRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRedisService = {
    acquireMultipleLocks: jest.fn(),
    releaseMultipleLocks: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: ReservationsRepository,
          useValue: mockReservationsRepository,
        },
        {
          provide: SeatsRepository,
          useValue: mockSeatsRepository,
        },
        {
          provide: SessionsRepository,
          useValue: mockSessionsRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    reservationsRepository = module.get(ReservationsRepository);
    seatsRepository = module.get(SeatsRepository);
    sessionsRepository = module.get(SessionsRepository);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateReservationDto = {
      sessionId: 'session-uuid-123',
      seatIds: ['seat-uuid-1', 'seat-uuid-2'],
      userId: 'user-123',
      userEmail: 'user@example.com',
    };

    const mockSession = {
      id: 'session-uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date(),
      endTime: new Date(),
      ticketPrice: '25.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSeats = [
      {
        id: 'seat-uuid-1',
        sessionId: 'session-uuid-123',
        seatNumber: 'A1',
        status: 'available',
        reservationId: null,
        createdAt: new Date(),
      },
      {
        id: 'seat-uuid-2',
        sessionId: 'session-uuid-123',
        seatNumber: 'A2',
        status: 'available',
        reservationId: null,
        createdAt: new Date(),
      },
    ];

    const mockReservation = {
      id: 'reservation-uuid-123',
      sessionId: 'session-uuid-123',
      userId: 'user-123',
      userEmail: 'user@example.com',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      sessionsRepository.findById.mockResolvedValue(mockSession as any);
      seatsRepository.findByIds.mockResolvedValue(mockSeats);
      redisService.acquireMultipleLocks.mockResolvedValue({
        success: true,
        failedKey: null,
      });
      reservationsRepository.create.mockResolvedValue(mockReservation as any);
      seatsRepository.updateManyStatus.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue('OK');
      redisService.releaseMultipleLocks.mockResolvedValue(2);
    });

    it('should create a reservation successfully', async () => {
      const result = await service.create(validDto);

      expect(result).toMatchObject({
        id: mockReservation.id,
        sessionId: mockReservation.sessionId,
        seatIds: ['seat-uuid-1', 'seat-uuid-2'],
        seatNumbers: ['A1', 'A2'],
        userEmail: mockReservation.userEmail,
        status: 'pending',
      });

      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(30);

      expect(sessionsRepository.findById).toHaveBeenCalledWith(
        'session-uuid-123',
      );
      expect(redisService.acquireMultipleLocks).toHaveBeenCalled();
      expect(reservationsRepository.create).toHaveBeenCalled();
      expect(seatsRepository.updateManyStatus).toHaveBeenCalledWith(
        ['seat-uuid-1', 'seat-uuid-2'],
        'reserved',
        mockReservation.id,
      );
      expect(redisService.set).toHaveBeenCalled();
      expect(redisService.releaseMultipleLocks).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session does not exist', async () => {
      sessionsRepository.findById.mockResolvedValue(null as any);

      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(validDto)).rejects.toThrow(
        'Session with ID session-uuid-123 not found',
      );

      expect(sessionsRepository.findById).toHaveBeenCalledWith(
        'session-uuid-123',
      );
      expect(redisService.acquireMultipleLocks).not.toHaveBeenCalled();
    });

    it('should sort seat IDs to prevent deadlock', async () => {
      const unorderedDto = {
        ...validDto,
        seatIds: ['seat-uuid-2', 'seat-uuid-1'], // unordered
      };

      await service.create(unorderedDto);

      const lockCall = redisService.acquireMultipleLocks.mock.calls[0];
      const lockKeys = lockCall[0];

      // Verify locks are acquired in sorted order
      expect(lockKeys[0]).toBe('lock:seat:seat-uuid-1');
      expect(lockKeys[1]).toBe('lock:seat:seat-uuid-2');
    });

    it('should throw ConflictException when unable to acquire lock', async () => {
      redisService.acquireMultipleLocks.mockResolvedValue({
        success: false,
        failedKey: 'lock:seat:seat-uuid-1',
      });

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'One or more seats are currently being reserved by another user',
      );

      expect(redisService.releaseMultipleLocks).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when some seats do not exist', async () => {
      seatsRepository.findByIds.mockResolvedValue([mockSeats[0]] as any); // only one seat found

      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(validDto)).rejects.toThrow(
        'Seats not found: seat-uuid-2',
      );

      expect(redisService.releaseMultipleLocks).toHaveBeenCalled(); // locks should be released
    });

    it('should throw BadRequestException when seats belong to different session', async () => {
      const wrongSessionSeats = [
        { ...mockSeats[0] },
        { ...mockSeats[1], sessionId: 'different-session-uuid' },
      ];
      seatsRepository.findByIds.mockResolvedValue(wrongSessionSeats as any);

      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'do not belong to session',
      );

      expect(redisService.releaseMultipleLocks).toHaveBeenCalled();
    });

    it('should throw ConflictException when seats are not available', async () => {
      const reservedSeats = [
        { ...mockSeats[0] },
        { ...mockSeats[1], status: 'reserved' },
      ];
      seatsRepository.findByIds.mockResolvedValue(reservedSeats as any);

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'Seats already reserved or sold',
      );

      expect(redisService.releaseMultipleLocks).toHaveBeenCalled();
    });

    it('should release locks even when database operation fails', async () => {
      reservationsRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(validDto)).rejects.toThrow('Database error');

      expect(redisService.releaseMultipleLocks).toHaveBeenCalled();
    });

    it('should cache reservation in Redis with TTL', async () => {
      await service.create(validDto);

      expect(redisService.set).toHaveBeenCalledWith(
        `reservation:${mockReservation.id}`,
        expect.objectContaining({
          id: mockReservation.id,
          sessionId: mockReservation.sessionId,
          seatIds: ['seat-uuid-1', 'seat-uuid-2'],
          userEmail: mockReservation.userEmail,
          status: 'pending',
        }),
        30, // TTL in seconds
      );
    });
  });

  describe('findOne', () => {
    const reservationId = 'reservation-uuid-123';

    const mockCachedReservation = {
      id: reservationId,
      sessionId: 'session-uuid-123',
      seatIds: ['seat-uuid-1', 'seat-uuid-2'],
      userEmail: 'user@example.com',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30000),
    };

    const mockSeats = [
      {
        id: 'seat-uuid-1',
        sessionId: 'session-uuid-123',
        seatNumber: 'A1',
        status: 'reserved',
        reservationId,
        createdAt: new Date(),
      },
      {
        id: 'seat-uuid-2',
        sessionId: 'session-uuid-123',
        seatNumber: 'A2',
        status: 'reserved',
        reservationId,
        createdAt: new Date(),
      },
    ];

    it('should return reservation from cache when available', async () => {
      redisService.get.mockResolvedValue(mockCachedReservation as any);
      seatsRepository.findByIds.mockResolvedValue(mockSeats);

      const result = await service.findOne(reservationId);

      expect(result).toMatchObject({
        id: reservationId,
        sessionId: 'session-uuid-123',
        userEmail: 'user@example.com',
        status: 'pending',
        seatNumbers: ['A1', 'A2'],
      });

      expect(redisService.get).toHaveBeenCalledWith(
        `reservation:${reservationId}`,
      );
      expect(reservationsRepository.findById).not.toHaveBeenCalled();
    });

    it('should fallback to database when cache miss', async () => {
      redisService.get.mockResolvedValue(null);

      const mockDbReservation = {
        id: reservationId,
        sessionId: 'session-uuid-123',
        userId: 'user-123',
        userEmail: 'user@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      reservationsRepository.findById.mockResolvedValue(mockDbReservation as any);
      seatsRepository.findByReservationId.mockResolvedValue(mockSeats);

      const result = await service.findOne(reservationId);

      expect(result).toMatchObject({
        id: reservationId,
        sessionId: 'session-uuid-123',
        userEmail: 'user@example.com',
        status: 'pending',
        seatNumbers: ['A1', 'A2'],
      });

      expect(reservationsRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(seatsRepository.findByReservationId).toHaveBeenCalledWith(
        reservationId,
      );
    });

    it('should throw NotFoundException when reservation does not exist', async () => {
      redisService.get.mockResolvedValue(null);
      reservationsRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(reservationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(reservationId)).rejects.toThrow(
        `Reservation with ID ${reservationId} not found`,
      );
    });

    it('should calculate remaining seconds correctly', async () => {
      const futureExpiration = new Date(Date.now() + 15000); // 15 seconds from now
      redisService.get.mockResolvedValue({
        ...mockCachedReservation,
        expiresAt: futureExpiration,
      } as any);
      seatsRepository.findByIds.mockResolvedValue(mockSeats);

      const result = await service.findOne(reservationId);

      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(15);
    });
  });

  describe('cancel', () => {
    const reservationId = 'reservation-uuid-123';

    const mockReservation = {
      id: reservationId,
      sessionId: 'session-uuid-123',
      userId: 'user-123',
      userEmail: 'user@example.com',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSeats = [
      {
        id: 'seat-uuid-1',
        sessionId: 'session-uuid-123',
        seatNumber: 'A1',
        status: 'reserved',
        reservationId,
        createdAt: new Date(),
      },
      {
        id: 'seat-uuid-2',
        sessionId: 'session-uuid-123',
        seatNumber: 'A2',
        status: 'reserved',
        reservationId,
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      reservationsRepository.findById.mockResolvedValue(mockReservation as any);
      seatsRepository.findByReservationId.mockResolvedValue(mockSeats);
      reservationsRepository.updateStatus.mockResolvedValue(undefined);
      seatsRepository.updateManyStatus.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);
    });

    it('should cancel a reservation successfully', async () => {
      await service.cancel(reservationId);

      expect(reservationsRepository.updateStatus).toHaveBeenCalledWith(
        reservationId,
        'cancelled',
      );

      expect(seatsRepository.updateManyStatus).toHaveBeenCalledWith(
        ['seat-uuid-1', 'seat-uuid-2'],
        'available',
        null,
      );

      expect(redisService.del).toHaveBeenCalledWith(
        `reservation:${reservationId}`,
      );
    });

    it('should throw NotFoundException when reservation does not exist', async () => {
      reservationsRepository.findById.mockResolvedValue(null);

      await expect(service.cancel(reservationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel(reservationId)).rejects.toThrow(
        `Reservation with ID ${reservationId} not found`,
      );

      expect(reservationsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when reservation is not pending', async () => {
      const confirmedReservation = { ...mockReservation, status: 'confirmed' as const };
      reservationsRepository.findById.mockResolvedValue(confirmedReservation as any);

      await expect(service.cancel(reservationId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(reservationId)).rejects.toThrow(
        'Cannot cancel reservation with status: confirmed',
      );

      expect(reservationsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should release all seats back to available status', async () => {
      await service.cancel(reservationId);

      expect(seatsRepository.updateManyStatus).toHaveBeenCalledWith(
        expect.arrayContaining(['seat-uuid-1', 'seat-uuid-2']),
        'available',
        null,
      );
    });
  });

  describe('processExpiredReservations', () => {
    const mockExpiredReservations = [
      {
        id: 'expired-1',
        sessionId: 'session-uuid-123',
        userId: 'user-123',
        userEmail: 'user1@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // already expired
        createdAt: new Date(Date.now() - 31000),
        updatedAt: new Date(Date.now() - 31000),
      },
      {
        id: 'expired-2',
        sessionId: 'session-uuid-456',
        userId: 'user-456',
        userEmail: 'user2@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() - 2000),
        createdAt: new Date(Date.now() - 32000),
        updatedAt: new Date(Date.now() - 32000),
      },
    ];

    beforeEach(() => {
      reservationsRepository.findExpired.mockResolvedValue(
        mockExpiredReservations as any,
      );
      reservationsRepository.updateStatus.mockResolvedValue(undefined);
      seatsRepository.findByReservationId.mockImplementation((id) => {
        if (id === 'expired-1') {
          return Promise.resolve([
            {
              id: 'seat-1',
              sessionId: 'session-uuid-123',
              seatNumber: 'A1',
              status: 'reserved' as const,
              reservationId: 'expired-1',
              createdAt: new Date(),
            },
          ] as any);
        }
        if (id === 'expired-2') {
          return Promise.resolve([
            {
              id: 'seat-2',
              sessionId: 'session-uuid-456',
              seatNumber: 'B1',
              status: 'reserved' as const,
              reservationId: 'expired-2',
              createdAt: new Date(),
            },
          ] as any);
        }
        return Promise.resolve([]);
      });
      seatsRepository.updateManyStatus.mockResolvedValue(undefined);
    });

    it('should process all expired reservations', async () => {
      const result = await service.processExpiredReservations();

      expect(result).toBe(2);
      expect(reservationsRepository.findExpired).toHaveBeenCalled();
      expect(reservationsRepository.updateStatus).toHaveBeenCalledTimes(2);
      expect(reservationsRepository.updateStatus).toHaveBeenCalledWith(
        'expired-1',
        'expired',
      );
      expect(reservationsRepository.updateStatus).toHaveBeenCalledWith(
        'expired-2',
        'expired',
      );
    });

    it('should release seats for each expired reservation', async () => {
      await service.processExpiredReservations();

      expect(seatsRepository.updateManyStatus).toHaveBeenCalledTimes(2);
      expect(seatsRepository.updateManyStatus).toHaveBeenCalledWith(
        ['seat-1'],
        'available',
        null,
      );
      expect(seatsRepository.updateManyStatus).toHaveBeenCalledWith(
        ['seat-2'],
        'available',
        null,
      );
    });

    it('should return 0 when no expired reservations exist', async () => {
      reservationsRepository.findExpired.mockResolvedValue([] as any);

      const result = await service.processExpiredReservations();

      expect(result).toBe(0);
      expect(reservationsRepository.updateStatus).not.toHaveBeenCalled();
      expect(seatsRepository.updateManyStatus).not.toHaveBeenCalled();
    });

    it('should continue processing even if one reservation fails', async () => {
      reservationsRepository.updateStatus.mockImplementation((id) => {
        if (id === 'expired-1') {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve(undefined);
      });

      const result = await service.processExpiredReservations();

      expect(result).toBe(2); // still returns total count
      expect(reservationsRepository.updateStatus).toHaveBeenCalledTimes(2);
      // Second reservation should still be processed
      expect(seatsRepository.findByReservationId).toHaveBeenCalledWith(
        'expired-2',
      );
    });
  });
});
