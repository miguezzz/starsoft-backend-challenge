import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, SaleResponseDto } from './dto';

/**
 * SalesController - HTTP endpoints for sales (payment confirmation)
 *
 * Handles conversion of reservations into confirmed sales
 * Follows REST principles and OpenAPI documentation
 */
@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Confirm payment and create sale',
    description:
      'Converts a pending reservation into a confirmed sale. Updates seat status to sold and removes reservation from cache.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sale created successfully',
    type: SaleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Reservation expired or already confirmed/cancelled',
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  async create(@Body() createSaleDto: CreateSaleDto): Promise<SaleResponseDto> {
    return this.salesService.create(createSaleDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get sale details',
    description: 'Retrieves sale information including seats and pricing',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale details',
    type: SaleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Sale not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get all sales for a user',
    description: 'Retrieves purchase history for a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user sales',
    type: [SaleResponseDto],
  })
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<SaleResponseDto[]> {
    return this.salesService.findByUser(userId);
  }
}