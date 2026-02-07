import { ApiProperty } from '@nestjs/swagger';

export class SaleResponseDto {
  @ApiProperty({
    description: 'Sale ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Original reservation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  reservationId: string;

  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'List of seat IDs purchased',
    example: ['a1b2c3d4-...', 'e5f6g7h8-...'],
    type: [String],
  })
  seatIds: string[];

  @ApiProperty({
    description: 'Seat numbers purchased',
    example: ['A1', 'A2', 'B3'],
    type: [String],
  })
  seatNumbers: string[];

  @ApiProperty({
    description: 'Customer email',
    example: 'user@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Total price paid',
    example: '50.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Sale creation date',
    example: '2026-02-07T10:00:00.000Z',
  })
  createdAt: Date;
}