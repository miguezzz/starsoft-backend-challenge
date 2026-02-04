import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionResponseDto,
} from './dto';

@ApiTags('sessions')
@Controller('sessions')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar nova sessão',
    description:
      'Cria uma nova sessão de cinema com os assentos automaticamente gerados',
  })
  @ApiCreatedResponse({
    description: 'Sessão criada com sucesso',
    type: SessionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos fornecidos',
  })
  create(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as sessões',
    description: 'Retorna todas as sessões cadastradas com informações de disponibilidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões retornada com sucesso',
    type: [SessionResponseDto],
  })
  findAll(): Promise<SessionResponseDto[]> {
    return this.sessionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar sessão por ID',
    description: 'Retorna os detalhes de uma sessão específica',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da sessão',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão encontrada',
    type: SessionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Sessão não encontrada',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar sessão',
    description: 'Atualiza os dados de uma sessão existente',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da sessão',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão atualizada com sucesso',
    type: SessionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Sessão não encontrada',
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos fornecidos',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.update(id, updateSessionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar sessão',
    description: 'Remove uma sessão e todos os seus assentos',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da sessão',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Sessão deletada com sucesso',
  })
  @ApiNotFoundResponse({
    description: 'Sessão não encontrada',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sessionsService.remove(id);
  }
}
