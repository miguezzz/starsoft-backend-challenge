import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Nome do filme',
    example: 'Avatar: O Caminho da Água',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  movieName: string;

  @ApiProperty({
    description: 'Número da sala',
    example: 'Sala 1',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomNumber: string;

  @ApiProperty({
    description: 'Horário de início da sessão',
    example: '2026-02-10T19:00:00.000Z',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Horário de término da sessão',
    example: '2026-02-10T21:30:00.000Z',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    description: 'Preço do ingresso em reais',
    example: 25.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  ticketPrice: number;

  @ApiProperty({
    description: 'Número de assentos disponíveis (mínimo 16)',
    example: 20,
    minimum: 16,
  })
  @IsInt()
  @Min(16, { message: 'A sala deve ter no mínimo 16 assentos' })
  totalSeats: number;
}
