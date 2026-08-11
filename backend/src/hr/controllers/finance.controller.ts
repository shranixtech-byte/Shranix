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
import {
  EmployeeAdvancesService,
  EmployeeExpensesService,
  PerformanceReviewsService,
} from '../services/finance.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/advances')
export class EmployeeAdvancesController {
  constructor(private readonly service: EmployeeAdvancesService) {}

  @Post()
  @Permissions('hr.advance')
  @ApiOperation({ summary: 'Request employee advance' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List advances' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      employeeId,
      status,
    });
  }

  @Post(':id/approve')
  @Permissions('hr.advance')
  @ApiOperation({ summary: 'Approve advance' })
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Post(':id/recover')
  @Permissions('hr.advance')
  @ApiOperation({ summary: 'Record a recovery installment' })
  @HttpCode(HttpStatus.OK)
  async recover(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.recover(id, Number(body.amount) || 0, userId);
  }
}

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/expenses')
export class EmployeeExpensesController {
  constructor(private readonly service: EmployeeExpensesService) {}

  @Post()
  @Permissions('hr.expense')
  @ApiOperation({ summary: 'Create expense claim' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List expense claims' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      employeeId,
      status,
      category,
    });
  }

  @Post(':id/submit')
  @Permissions('hr.expense')
  @ApiOperation({ summary: 'Submit expense for approval' })
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.submit(id, userId);
  }

  @Post(':id/approve')
  @Permissions('hr.expense.approve')
  @ApiOperation({ summary: 'Approve expense' })
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Post(':id/reject')
  @Permissions('hr.expense.approve')
  @ApiOperation({ summary: 'Reject expense' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reject(id, userId, body?.reason);
  }

  @Post(':id/paid')
  @Permissions('hr.expense')
  @ApiOperation({ summary: 'Mark expense paid' })
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @Param('id') id: string,
    @Body() body: { paymentMode?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markPaid(id, userId, body?.paymentMode);
  }
}

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/performance')
export class PerformanceReviewsController {
  constructor(private readonly service: PerformanceReviewsService) {}

  @Post()
  @Permissions('hr.performance')
  @ApiOperation({ summary: 'Create performance review' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List performance reviews' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      employeeId,
      status,
    });
  }

  @Post(':id/submit')
  @Permissions('hr.performance')
  @ApiOperation({ summary: 'Submit review' })
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.submit(id, userId);
  }

  @Put(':id/review')
  @Permissions('hr.performance')
  @ApiOperation({ summary: 'Manager review with rating' })
  @HttpCode(HttpStatus.OK)
  async review(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.review(id, body, userId);
  }
}
