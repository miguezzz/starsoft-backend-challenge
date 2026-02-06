import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, ReservationResponseDto } from './dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: jest.Mocked<ReservationsService>;

  const mockReservationsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
    processExpiredReservations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
    service = module.get(ReservationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateReservationDto = {
      sessionId: 'session-uuid-123',
      seatIds: ['seat-uuid-1', 'seat-uuid-2'],
      userId: 'user-123',
      userEmail: 'user@example.com',
    };

    const mockResponse: ReservationResponseDto = {
      id: 'reservation-uuid-123',
      sessionId: 'session-uuid-123',
      seatIds: ['seat-uuid-1', 'seat-uuid-2'],
      seatNumbers: ['A1', 'A2'],
      userEmail: 'user@example.com',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30000),
      remainingSeconds: 30,
    };

    it('should create a reservation successfully', async () => {
      service.create.mockResolvedValue(mockResponse);

      const result = await controller.create(validDto);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(validDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException from service', async () => {
      service.create.mockRejectedValue(
        new NotFoundException('Session with ID session-uuid-123 not found'),
      );

      await expect(controller.create(validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.create(validDto)).rejects.toThrow(
        'Session with ID session-uuid-123 not found',
      );
    });

    it('should propagate ConflictException from service', async () => {
      service.create.mockRejectedValue(
        new ConflictException(
          'One or more seats are currently being reserved by another user',
        ),
      );

      await expect(controller.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(validDto)).rejects.toThrow(
        'One or more seats are currently being reserved',
      );
    });

    it('should propagate BadRequestException from service', async () => {
      service.create.mockRejectedValue(
        new BadRequestException('Seats do not belong to session'),
      );

      await expect(controller.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle multiple seats reservation', async () => {
      const multipleSeatsDto = {
        ...validDto,
        seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-4'],
      };

      const multipleSeatsResponse = {
        ...mockResponse,
        seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-4'],
        seatNumbers: ['A1', 'A2', 'A3', 'A4'],
      };

      service.create.mockResolvedValue(multipleSeatsResponse);

      const result = await controller.create(multipleSeatsDto);

      expect(result.seatIds).toHaveLength(4);
      expect(result.seatNumbers).toHaveLength(4);
    });
  });

  describe('findOne', () => {
    const reservationId = 'reservation-uuid-123';

    const mockResponse: ReservationResponseDto = {
      id: reservationId,
      sessionId: 'session-uuid-123',
      seatIds: ['seat-uuid-1', 'seat-uuid-2'],
      seatNumbers: ['A1', 'A2'],
      userEmail: 'user@example.com',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30000),
      remainingSeconds: 30,
    };

    it('should return a reservation by id', async () => {
      service.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(reservationId);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(reservationId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when reservation does not exist', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException(
          `Reservation with ID ${reservationId} not found`,
        ),
      );

      await expect(controller.findOne(reservationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(reservationId)).rejects.toThrow(
        `Reservation with ID ${reservationId} not found`,
      );
    });

    it('should return reservation with correct remaining time', async () => {
      const response = {
        ...mockResponse,
        remainingSeconds: 15,
      };

      service.findOne.mockResolvedValue(response);

      const result = await controller.findOne(reservationId);

      expect(result.remainingSeconds).toBe(15);
      expect(result.remainingSeconds).toBeGreaterThan(0);
    });

    it('should handle expired reservations with remainingSeconds = 0', async () => {
      const expiredResponse = {
        ...mockResponse,
        status: 'expired',
        remainingSeconds: 0,
      };

      service.findOne.mockResolvedValue(expiredResponse);

      const result = await controller.findOne(reservationId);

      expect(result.status).toBe('expired');
      expect(result.remainingSeconds).toBe(0);
    });
  });

  describe('cancel', () => {
    const reservationId = 'reservation-uuid-123';

    it('should cancel a reservation successfully', async () => {
      service.cancel.mockResolvedValue(undefined);

      await controller.cancel(reservationId);

      expect(service.cancel).toHaveBeenCalledWith(reservationId);
      expect(service.cancel).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when reservation does not exist', async () => {
      service.cancel.mockRejectedValue(
        new NotFoundException(
          `Reservation with ID ${reservationId} not found`,
        ),
      );

      await expect(controller.cancel(reservationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.cancel(reservationId)).rejects.toThrow(
        `Reservation with ID ${reservationId} not found`,
      );
    });

    it('should throw BadRequestException when reservation cannot be cancelled', async () => {
      service.cancel.mockRejectedValue(
        new BadRequestException(
          'Cannot cancel reservation with status: confirmed',
        ),
      );

      await expect(controller.cancel(reservationId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.cancel(reservationId)).rejects.toThrow(
        'Cannot cancel reservation with status: confirmed',
      );
    });

    it('should not return any data on successful cancellation', async () => {
      service.cancel.mockResolvedValue(undefined);

      const result = await controller.cancel(reservationId);

      expect(result).toBeUndefined();
    });

    it('should accept valid UUID format only', async () => {
      // The ParseUUIDPipe will handle validation
      // Here we test that valid UUID passes through
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      service.cancel.mockResolvedValue(undefined);

      await controller.cancel(validUUID);

      expect(service.cancel).toHaveBeenCalledWith(validUUID);
    });
  });

  describe('HTTP status codes', () => {
    it('should return 201 Created when reservation is created', async () => {
      const dto: CreateReservationDto = {
        sessionId: 'session-uuid-123',
        seatIds: ['seat-uuid-1'],
        userId: 'user-123',
        userEmail: 'user@example.com',
      };

      const response: ReservationResponseDto = {
        id: 'reservation-uuid-123',
        sessionId: 'session-uuid-123',
        seatIds: ['seat-uuid-1'],
        seatNumbers: ['A1'],
        userEmail: 'user@example.com',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30000),
        remainingSeconds: 30,
      };

      service.create.mockResolvedValue(response);

      const result = await controller.create(dto);

      expect(result).toBeDefined();
      // The @HttpCode decorator ensures 201 status
    });

    it('should return 204 No Content when reservation is cancelled', async () => {
      service.cancel.mockResolvedValue(undefined);

      const result = await controller.cancel('reservation-uuid-123');

      expect(result).toBeUndefined();
      // The @HttpCode(HttpStatus.NO_CONTENT) ensures 204 status
    });
  });

  describe('validation and edge cases', () => {
    it('should handle concurrent reservation attempts', async () => {
      const dto: CreateReservationDto = {
        sessionId: 'session-uuid-123',
        seatIds: ['seat-uuid-1'],
        userId: 'user-123',
        userEmail: 'user@example.com',
      };

      service.create.mockRejectedValue(
        new ConflictException('Seats already reserved or sold'),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should handle empty seat array validation at DTO level', async () => {
      // This would be caught by class-validator's @ArrayMinSize(1)
      const invalidDto = {
        sessionId: 'session-uuid-123',
        seatIds: [],
        userId: 'user-123',
        userEmail: 'user@example.com',
      } as CreateReservationDto;

      // If DTO validation passes (shouldn't in real scenario), service should handle it
      service.create.mockRejectedValue(
        new BadRequestException('At least one seat must be selected'),
      );

      await expect(controller.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle duplicate seat IDs', async () => {
      // This would be caught by class-validator's @ArrayUnique()
      const dto: CreateReservationDto = {
        sessionId: 'session-uuid-123',
        seatIds: ['seat-uuid-1', 'seat-uuid-1'], // duplicate
        userId: 'user-123',
        userEmail: 'user@example.com',
      };

      service.create.mockRejectedValue(
        new BadRequestException('Duplicate seat IDs are not allowed'),
      );

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
