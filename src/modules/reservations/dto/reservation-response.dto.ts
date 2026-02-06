import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
  @ApiProperty({
    description: 'ID da reserva',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID da sessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Lista de IDs dos assentos reservados',
    example: ['a1b2c3d4-...', 'e5f6g7h8-...'],
    type: [String],
  })
  seatIds: string[];

  @ApiProperty({
    description: 'Números dos assentos reservados',
    example: ['A1', 'A2', 'B3'],
    type: [String],
  })
  seatNumbers: string[];

  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Status da reserva',
    example: 'pending',
    enum: ['pending', 'confirmed', 'cancelled', 'expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Data de criação da reserva',
    example: '2026-02-04T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de expiração da reserva (30 segundos após criação)',
    example: '2026-02-04T10:00:30.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Tempo restante em segundos até expiração',
    example: 25,
  })
  remainingSeconds: number;
}
