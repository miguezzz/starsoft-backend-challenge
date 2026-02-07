import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, ReservationResponseDto } from './dto';

/**
 * ReservationsController - HTTP endpoints for seat reservations
 *
 * Follows REST principles and OpenAPI documentation (Open/Closed Principle)
 * Delegates business logic to service layer (Single Responsibility)
 */
@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new seat reservation',
    description:
      'Reserves seats for a session with 30-second TTL. Uses distributed locking to prevent double-booking.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or seats belong to different session',
  })
  @ApiNotFoundResponse({ description: 'Session or seats not found' })
  @ApiConflictResponse({
    description: 'Seats already reserved or being reserved by another user',
  })
  async create(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.create(createReservationDto);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm a reservation',
    description:
      'Confirms a pending reservation, converting it to a sale. Must be done within 30 seconds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation confirmed and converted to sale',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({
    description: 'Cannot confirm reservation with current status or expired',
  })
  async confirm(@Param('id', ParseUUIDPipe) id: string): Promise<ReservationResponseDto> {
    return this.reservationsService.confirm(id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get reservation details',
    description: 'Retrieves reservation information including remaining time',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation details',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel a reservation',
    description:
      'Cancels a pending reservation and releases seats back to available status',
  })
  @ApiResponse({
    status: 204,
    description: 'Reservation cancelled successfully',
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({
    description: 'Cannot cancel reservation with current status',
  })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.reservationsService.cancel(id);
  }
}
