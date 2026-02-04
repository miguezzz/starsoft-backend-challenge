import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'ID único da sessão',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do filme',
    example: 'Avatar: O Caminho da Água',
  })
  movieName: string;

  @ApiProperty({
    description: 'Número da sala',
    example: 'Sala 1',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Horário de início da sessão',
    example: '2026-02-10T19:00:00.000Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Horário de término da sessão',
    example: '2026-02-10T21:30:00.000Z',
  })
  endTime: Date;

  @ApiProperty({
    description: 'Preço do ingresso',
    example: '25.00',
  })
  ticketPrice: string;

  @ApiProperty({
    description: 'Total de assentos na sessão',
    example: 20,
  })
  totalSeats: number;

  @ApiProperty({
    description: 'Assentos disponíveis',
    example: 15,
  })
  availableSeats: number;

  @ApiProperty({
    description: 'Data de criação',
    example: '2026-02-04T10:00:00.000Z',
  })
  createdAt: Date;
}
