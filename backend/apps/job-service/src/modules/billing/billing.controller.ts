import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetBillingSummaryQuery } from './queries/get-billing-summary.query';
import { GetBillingByJobIdQuery } from './queries/get-billing-by-job-id.query';
import { BillingSummaryResponseDto, BillingByJobResponseDto } from './dtos';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get billing summary across all completed jobs' })
  @ApiResponse({ status: HttpStatus.OK, type: BillingSummaryResponseDto })
  getSummary(): Promise<BillingSummaryResponseDto> {
    return this.queryBus.execute(new GetBillingSummaryQuery());
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get billing details for a specific job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: HttpStatus.OK, type: BillingByJobResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  getByJobId(@Param('id') id: string): Promise<BillingByJobResponseDto> {
    return this.queryBus.execute(new GetBillingByJobIdQuery(id));
  }
}
