import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PayrollService, SalaryStructuresService } from '../services/payroll.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/payroll')
export class PayrollController {
  constructor(
    private readonly service: PayrollService,
    private readonly salaries: SalaryStructuresService,
  ) {}

  // ── Salary structures ──────────────────────────────────
  @Get('salary-structures')
  @Permissions('hr.salary.view')
  @ApiOperation({ summary: 'List salary structures' })
  @HttpCode(HttpStatus.OK)
  async listSalaries(
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: number,
    @Query('ps') ps?: number,
  ) {
    return this.salaries.list({ employeeId, page: Number(page) || 1, pageSize: Number(ps) || 50 });
  }

  @Post('salary-structures')
  @Permissions('hr.salary')
  @ApiOperation({ summary: 'Create salary structure (deactivates previous)' })
  @HttpCode(HttpStatus.CREATED)
  async createSalary(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.salaries.create(body, userId);
  }

  @Put('salary-structures/:id')
  @Permissions('hr.salary')
  @ApiOperation({ summary: 'Update salary structure' })
  @HttpCode(HttpStatus.OK)
  async updateSalary(@Param('id') id: string, @Body() body: any) {
    return this.salaries.update(id, body);
  }

  // ── Payroll runs ───────────────────────────────────────
  @Post('generate')
  @Permissions('hr.payroll')
  @ApiOperation({ summary: 'Generate payroll run for a period (draft)' })
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.generateRun(body, userId);
  }

  @Get()
  @Permissions('hr.payroll')
  @ApiOperation({ summary: 'List payroll runs' })
  @HttpCode(HttpStatus.OK)
  async listRuns(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('status') status?: string,
  ) {
    return this.service.listRuns({ page: Number(page) || 1, pageSize: Number(ps) || 20, status });
  }

  @Post(':id/approve')
  @Permissions('hr.payroll.approve')
  @ApiOperation({ summary: 'Approve payroll run' })
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approveRun(id, userId);
  }

  @Post(':id/paid')
  @Permissions('hr.payroll')
  @ApiOperation({ summary: 'Mark payroll run as paid' })
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @Param('id') id: string,
    @Body() body: { paymentMode?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markPaid(id, userId, body?.paymentMode);
  }

  @Get('payslip')
  @Permissions('hr.payroll')
  @ApiOperation({ summary: 'Payslip data for an employee' })
  @HttpCode(HttpStatus.OK)
  async payslip(
    @Query('employeeId') employeeId: string,
    @Query('payrollRunId') payrollRunId?: string,
  ) {
    return this.service.payslip(employeeId, payrollRunId);
  }

  @Get(':id')
  @Permissions('hr.payroll')
  @ApiOperation({ summary: 'Payroll run detail with employee lines' })
  @HttpCode(HttpStatus.OK)
  async findRun(@Param('id') id: string) {
    return this.service.findRunById(id);
  }
}
