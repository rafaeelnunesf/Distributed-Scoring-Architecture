import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListCarriersQueryDto } from './dto/list-carriers-query.dto';
import { CarriersService } from './carriers.service';

@ApiTags('Carriers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) { }

  @Get()
  @ApiOperation({ summary: 'List carriers with cursor-based pagination' })
  @ApiQuery({ name: 'min_score', required: false, type: Number })
  @ApiQuery({ name: 'max_score', required: false, type: Number })
  @ApiQuery({ name: 'authority_status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Carrier list retrieved' })
  async list(@Query() query: ListCarriersQueryDto): Promise<{
    data: unknown[];
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    return this.carriersService.list(query);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get score history for a carrier' })
  @ApiResponse({ status: 200, description: 'Carrier history retrieved' })
  async history(@Param('id') id: string): Promise<unknown[]> {
    return this.carriersService.getHistory(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get carrier details by id' })
  @ApiResponse({ status: 200, description: 'Carrier details retrieved' })
  async detail(@Param('id') id: string): Promise<unknown> {
    return this.carriersService.getById(id);
  }
}
