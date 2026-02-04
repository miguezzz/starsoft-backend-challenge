import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from '@/shared/database/repositories/sessions.repository';
import { SeatsRepository } from '@/shared/database/repositories/seats.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSessionDto } from './dto';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;

  const mockSessionsRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSeatsRepository = {
    createMany: jest.fn(),
    findBySessionId: jest.fn(),
    findAvailableBySessionId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: SessionsRepository,
          useValue: mockSessionsRepository,
        },
        {
          provide: SeatsRepository,
          useValue: mockSeatsRepository,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionsRepository = module.get(SessionsRepository);
    seatsRepository = module.get(SeatsRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateSessionDto = {
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: '2026-12-31T19:00:00.000Z',
      endTime: '2026-12-31T21:00:00.000Z',
      ticketPrice: 25.0,
      totalSeats: 20,
    };

    const mockSession = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date('2026-12-31T19:00:00.000Z'),
      endTime: new Date('2026-12-31T21:00:00.000Z'),
      ticketPrice: '25.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a session with seats successfully', async () => {
      sessionsRepository.create.mockResolvedValue(mockSession);
      seatsRepository.createMany.mockResolvedValue([]);

      const result = await service.create(validDto);

      expect(result).toEqual({
        id: mockSession.id,
        movieName: mockSession.movieName,
        roomNumber: mockSession.roomNumber,
        startTime: mockSession.startTime,
        endTime: mockSession.endTime,
        ticketPrice: mockSession.ticketPrice,
        totalSeats: validDto.totalSeats,
        availableSeats: validDto.totalSeats,
        createdAt: mockSession.createdAt,
      });

      expect(sessionsRepository.create).toHaveBeenCalledWith({
        movieName: validDto.movieName,
        roomNumber: validDto.roomNumber,
        startTime: new Date(validDto.startTime),
        endTime: new Date(validDto.endTime),
        ticketPrice: validDto.ticketPrice.toString(),
      });

      expect(seatsRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sessionId: mockSession.id,
            seatNumber: expect.any(String),
            status: 'available',
          }),
        ]),
      );
    });

    it('should throw BadRequestException if startTime >= endTime', async () => {
      const invalidDto = {
        ...validDto,
        startTime: '2026-12-31T21:00:00.000Z',
        endTime: '2026-12-31T19:00:00.000Z', // antes do start
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        'Start time must be before end time',
      );

      expect(sessionsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if startTime is in the past', async () => {
      const invalidDto = {
        ...validDto,
        startTime: '2020-01-01T19:00:00.000Z', // passado
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        'Cannot create session in the past',
      );

      expect(sessionsRepository.create).not.toHaveBeenCalled();
    });

    it('should generate correct number of seats', async () => {
      sessionsRepository.create.mockResolvedValue(mockSession);
      seatsRepository.createMany.mockResolvedValue([]);

      await service.create(validDto);

      const createManyCall = seatsRepository.createMany.mock.calls[0][0];
      expect(createManyCall).toHaveLength(validDto.totalSeats);
    });

    it('should generate seats in correct format (A1, A2, B1, B2...)', async () => {
      sessionsRepository.create.mockResolvedValue(mockSession);
      seatsRepository.createMany.mockResolvedValue([]);

      await service.create({ ...validDto, totalSeats: 16 });

      const createManyCall = seatsRepository.createMany.mock.calls[0][0];
      const seatNumbers = createManyCall.map((s) => s.seatNumber);

      expect(seatNumbers).toContain('A1');
      expect(seatNumbers).toContain('A2');
      expect(seatNumbers).toContain('B1');
      expect(seatNumbers[0]).toMatch(/^[A-J]\d+$/);
    });
  });

  describe('findAll', () => {
    it('should return all sessions with availability info', async () => {
      const mockSessions = [
        {
          id: 'uuid-1',
          movieName: 'Avatar',
          roomNumber: 'Sala 1',
          startTime: new Date(),
          endTime: new Date(),
          ticketPrice: '25.00',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSeats = [
        { id: '1', sessionId: 'uuid-1', seatNumber: 'A1', status: 'available' },
        { id: '2', sessionId: 'uuid-1', seatNumber: 'A2', status: 'sold' },
      ];

      sessionsRepository.findAll.mockResolvedValue(mockSessions);
      seatsRepository.findBySessionId.mockResolvedValue(mockSeats as any);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'uuid-1',
        totalSeats: 2,
        availableSeats: 1,
      });
    });

    it('should return empty array when no sessions exist', async () => {
      sessionsRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const mockSession = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date(),
      endTime: new Date(),
      ticketPrice: '25.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a session by id', async () => {
      const mockSeats = [
        { id: '1', sessionId: 'uuid-123', seatNumber: 'A1', status: 'available' },
      ];

      sessionsRepository.findById.mockResolvedValue(mockSession);
      seatsRepository.findBySessionId.mockResolvedValue(mockSeats as any);

      const result = await service.findOne('uuid-123');

      expect(result).toMatchObject({
        id: 'uuid-123',
        movieName: 'Avatar',
      });
      expect(sessionsRepository.findById).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      sessionsRepository.findById.mockResolvedValue(null as any);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Session with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const mockSession = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date('2026-12-31T19:00:00.000Z'),
      endTime: new Date('2026-12-31T21:00:00.000Z'),
      ticketPrice: '25.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a session successfully', async () => {
      const updateDto = { ticketPrice: 30.0 };
      const updatedSession = { ...mockSession, ticketPrice: '30.00' };

      sessionsRepository.findById.mockResolvedValue(mockSession);
      sessionsRepository.update.mockResolvedValue(updatedSession);
      seatsRepository.findBySessionId.mockResolvedValue([]);

      const result = await service.update('uuid-123', updateDto);

      expect(result.ticketPrice).toBe('30.00');
      expect(sessionsRepository.update).toHaveBeenCalledWith(
        'uuid-123',
        expect.objectContaining({
          ticketPrice: '30',
        }),
      );
    });

    it('should throw NotFoundException when session does not exist', async () => {
      sessionsRepository.findById.mockResolvedValue(null as any);

      await expect(
        service.update('invalid-id', { ticketPrice: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate dates when both are provided', async () => {
      const updateDto = {
        startTime: '2026-12-31T21:00:00.000Z',
        endTime: '2026-12-31T19:00:00.000Z', // antes do start
      };

      sessionsRepository.findById.mockResolvedValue(mockSession);

      await expect(service.update('uuid-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    const mockSession = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date(),
      endTime: new Date(),
      ticketPrice: '25.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a session successfully', async () => {
      sessionsRepository.findById.mockResolvedValue(mockSession);
      sessionsRepository.delete.mockResolvedValue(undefined);

      await service.remove('uuid-123');

      expect(sessionsRepository.delete).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      sessionsRepository.findById.mockResolvedValue(null as any);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
