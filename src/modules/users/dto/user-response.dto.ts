import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID único do usuário',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  name: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2026-02-07T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2026-02-07T10:00:00.000Z',
  })
  updatedAt: Date;
}
