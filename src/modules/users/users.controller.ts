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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@ApiTags('users')
@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo usuário',
    description: 'Cria um novo usuário no sistema com email único',
  })
  @ApiCreatedResponse({
    description: 'Usuário criado com sucesso',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Email já existe ou dados inválidos',
  })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna todos os usuários cadastrados no sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: [UserResponseDto],
  })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'Retorna os detalhes de um usuário específico',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuário não encontrado',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar usuário',
    description: 'Atualiza os dados de um usuário existente',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuário não encontrado',
  })
  @ApiBadRequestResponse({
    description: 'Email já existe ou dados inválidos',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Remove um usuário do sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Usuário deletado com sucesso',
  })
  @ApiNotFoundResponse({
    description: 'Usuário não encontrado',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
