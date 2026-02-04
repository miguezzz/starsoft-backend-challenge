import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: jest.Mocked<SessionsService>;

  const mockSessionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
    service = module.get(SessionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSessionDto = {
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: '2026-12-31T19:00:00.000Z',
      endTime: '2026-12-31T21:00:00.000Z',
      ticketPrice: 25.0,
      totalSeats: 20,
    };

    const mockResponse = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date('2026-12-31T19:00:00.000Z'),
      endTime: new Date('2026-12-31T21:00:00.000Z'),
      ticketPrice: '25.00',
      totalSeats: 20,
      availableSeats: 20,
      createdAt: new Date(),
    };

    it('should create a session', async () => {
      service.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException from service', async () => {
      service.create.mockRejectedValue(
        new BadRequestException('Start time must be before end time'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const mockSessions = [
      {
        id: 'uuid-1',
        movieName: 'Avatar',
        roomNumber: 'Sala 1',
        startTime: new Date(),
        endTime: new Date(),
        ticketPrice: '25.00',
        totalSeats: 20,
        availableSeats: 15,
        createdAt: new Date(),
      },
      {
        id: 'uuid-2',
        movieName: 'Matrix',
        roomNumber: 'Sala 2',
        startTime: new Date(),
        endTime: new Date(),
        ticketPrice: '20.00',
        totalSeats: 30,
        availableSeats: 30,
        createdAt: new Date(),
      },
    ];

    it('should return an array of sessions', async () => {
      service.findAll.mockResolvedValue(mockSessions);

      const result = await controller.findAll();

      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no sessions exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

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
      totalSeats: 20,
      availableSeats: 15,
      createdAt: new Date(),
    };

    it('should return a session by id', async () => {
      service.findOne.mockResolvedValue(mockSession);

      const result = await controller.findOne('uuid-123');

      expect(result).toEqual(mockSession);
      expect(service.findOne).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Session with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateSessionDto = {
      ticketPrice: 30.0,
    };

    const mockUpdatedSession = {
      id: 'uuid-123',
      movieName: 'Avatar',
      roomNumber: 'Sala 1',
      startTime: new Date(),
      endTime: new Date(),
      ticketPrice: '30.00',
      totalSeats: 20,
      availableSeats: 15,
      createdAt: new Date(),
    };

    it('should update a session', async () => {
      service.update.mockResolvedValue(mockUpdatedSession);

      const result = await controller.update('uuid-123', updateDto);

      expect(result).toEqual(mockUpdatedSession);
      expect(service.update).toHaveBeenCalledWith('uuid-123', updateDto);
    });

    it('should throw NotFoundException when session does not exist', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Session with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid dates', async () => {
      const invalidDto: UpdateSessionDto = {
        startTime: '2026-12-31T21:00:00.000Z',
        endTime: '2026-12-31T19:00:00.000Z',
      };

      service.update.mockRejectedValue(
        new BadRequestException('Start time must be before end time'),
      );

      await expect(controller.update('uuid-123', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a session', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('uuid-123');

      expect(service.remove).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Session with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
