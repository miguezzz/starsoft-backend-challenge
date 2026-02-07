import { ApiProperty } from '@nestjs/swagger';

export class SeatResponseDto {
  @ApiProperty({
    description: 'ID único do assento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID da sessão',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Número do assento',
    example: 'A1',
  })
  seatNumber: string;

  @ApiProperty({
    description: 'Status do assento',
    enum: ['available', 'reserved', 'sold'],
    example: 'available',
  })
  status: 'available' | 'reserved' | 'sold';

  @ApiProperty({
    description: 'ID da reserva (se houver)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  reservationId: string | null;

  @ApiProperty({
    description: 'Data de criação',
    example: '2026-02-04T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2026-02-04T10:00:00.000Z',
  })
  updatedAt: Date;
}
