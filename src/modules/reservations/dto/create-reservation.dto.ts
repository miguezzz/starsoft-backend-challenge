import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsUUID,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'ID da sessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Lista de IDs dos assentos a reservar',
    example: ['a1b2c3d4-...', 'e5f6g7h8-...'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @ArrayUnique({ message: 'Duplicate seat IDs are not allowed' })
  @IsUUID('4', { each: true })
  seatIds: string[];

  @ApiProperty({
    description: 'User id',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Email do usuário (para rastreamento)',
    example: 'user@example.com',
  })
  @IsString()
  userEmail: string;
}
