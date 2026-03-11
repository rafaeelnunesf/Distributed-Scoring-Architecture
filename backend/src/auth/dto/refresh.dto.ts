import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Optional when using cookie-based refresh' })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
