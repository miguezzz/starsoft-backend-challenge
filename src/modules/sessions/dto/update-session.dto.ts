import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: 'Nome do filme',
    example: 'Avatar: O Caminho da Água',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  movieName?: string;

  @ApiPropertyOptional({
    description: 'Número da sala',
    example: 'Sala 2',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  roomNumber?: string;

  @ApiPropertyOptional({
    description: 'Horário de início da sessão',
    example: '2026-02-10T20:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Horário de término da sessão',
    example: '2026-02-10T22:30:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Preço do ingresso',
    example: 30.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  ticketPrice?: number;
}
