import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ListUploadsQueryDto } from '../dto/list-uploads-query.dto';
import { CcfService } from '../services/ccf.service';
import { CcfRecord } from '../types/ccf.types';

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@ApiTags('CCF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ccf')
export class CcfController {
  constructor(private readonly ccfService: CcfService) { }

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CCF payload (JSON body or multipart file)' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'array',
          items: { type: 'object' },
        },
        {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 202, description: 'Upload accepted and queued' })
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ): Promise<{ jobId: string; status: 'processing'; total_records: number }> {
    const records = this.extractRecords(file, body);
    const filename = file?.originalname ?? 'payload.json';
    return this.ccfService.createUploadAndEnqueue(
      req.user.sub,
      filename,
      records,
      req.correlationId,
    );
  }

  @Get('uploads')
  @ApiOperation({ summary: 'List upload history for authenticated user' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upload list retrieved' })
  async uploads(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListUploadsQueryDto,
  ): Promise<unknown[]> {
    return this.ccfService.listUploads(
      req.user.sub,
      query.skip ?? 0,
      query.limit ?? 20,
    );
  }

  @Sse('upload/:jobId/status')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'SSE stream for upload job status' })
  async status(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ): Promise<Observable<MessageEvent>> {
    return this.ccfService.statusStreamForUser(req.user.sub, jobId);
  }

  private extractRecords(
    file: Express.Multer.File | undefined,
    body: unknown,
  ): CcfRecord[] {
    let records: unknown;
    if (file) {
      try {
        const parsed = JSON.parse(file.buffer.toString('utf8')) as unknown;
        records = this.extractRecordsFromBody(parsed);
      } catch {
        throw new BadRequestException('Uploaded file must contain valid JSON');
      }
    } else {
      records = this.extractRecordsFromBody(body);
    }

    if (!Array.isArray(records)) {
      throw new BadRequestException('Payload must be an array of carrier records');
    }

    const validated: CcfRecord[] = [];
    for (const item of records) {
      if (!this.isCcfRecord(item)) {
        throw new BadRequestException(
          'Each record must be an object containing dot_number',
        );
      }
      validated.push(item);
    }

    return validated;
  }

  private extractRecordsFromBody(body: unknown): unknown {
    if (Array.isArray(body)) {
      return body;
    }

    if (typeof body === 'object' && body !== null && 'records' in body) {
      const records = (body as { records: unknown }).records;
      return records;
    }

    if (typeof body === 'object' && body !== null && 'carriers' in body) {
      const carriers = (body as { carriers: unknown }).carriers;
      return carriers;
    }

    return body;
  }

  private isCcfRecord(value: unknown): value is CcfRecord {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    if (!('dot_number' in value)) {
      return false;
    }
    const dot = (value as { dot_number: unknown }).dot_number;
    return typeof dot === 'string' && dot.trim().length > 0;
  }
}
