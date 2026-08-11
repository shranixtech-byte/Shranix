import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExpensesService } from '../services/expenses.service';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get('dashboard')
  @Permissions('expense.view')
  @ApiOperation({ summary: 'Expense dashboard KPIs' })
  async dashboard() {
    return this.service.dashboard();
  }

  @Get('reports')
  @Permissions('expense.report')
  @ApiOperation({ summary: 'Expense register report' })
  async reports(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.reports({ status, categoryId, employeeId, dateFrom, dateTo });
  }

  @Get('next-number')
  @Permissions('expense.view')
  @ApiOperation({ summary: 'Next auto expense number' })
  async nextNumber() {
    return { nextNumber: await this.service.nextExpenseNumber() };
  }

  @Get('categories')
  @Permissions('expense.view')
  @ApiOperation({ summary: 'List expense categories' })
  async listCategories() {
    return this.service.listCategories();
  }

  @Post('categories')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Create expense category' })
  async createCategory(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.createCategory(body, userId);
  }

  @Put('categories/:id')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Update expense category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateCategory(id, body, userId);
  }

  @Get('recurring')
  @Permissions('expense.view')
  @ApiOperation({ summary: 'List recurring expenses' })
  async listRecurring() {
    return this.service.listRecurring();
  }

  @Post('recurring')
  @Permissions('expense.create')
  @ApiOperation({ summary: 'Create recurring expense template' })
  async createRecurring(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.createRecurring(body, userId);
  }

  @Post('recurring/generate')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Generate expenses due from recurring templates (dedup-safe)' })
  async generateRecurring(@CurrentUser('id') userId: string) {
    return this.service.generateRecurring(userId);
  }

  @Put('recurring/:id')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Update recurring expense template' })
  async updateRecurring(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateRecurring(id, body, userId);
  }

  @Delete('recurring/:id')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Deactivate recurring expense template' })
  async deleteRecurring(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.deleteRecurring(id, userId);
  }

  @Get()
  @Permissions('expense.view')
  @ApiOperation({ summary: 'List expenses' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
      categoryId,
      employeeId,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  @Permissions('expense.view')
  @ApiOperation({ summary: 'Get expense by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('expense.create')
  @ApiOperation({ summary: 'Create expense' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Update expense' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('expense.delete')
  @ApiOperation({ summary: 'Delete expense' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }

  @Post(':id/submit')
  @Permissions('expense.edit')
  @ApiOperation({ summary: 'Submit expense for approval' })
  async submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.submit(id, userId);
  }

  @Post(':id/approve')
  @Permissions('expense.approve')
  @ApiOperation({ summary: 'Approve expense' })
  async approve(
    @Param('id') id: string,
    @Body() body: { remarks?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approve(id, userId, body?.remarks);
  }

  @Post(':id/reject')
  @Permissions('expense.approve')
  @ApiOperation({ summary: 'Reject expense' })
  async reject(
    @Param('id') id: string,
    @Body() body: { remarks?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reject(id, userId, body?.remarks);
  }

  @Post(':id/pay')
  @Permissions('expense.pay')
  @ApiOperation({ summary: 'Pay expense (creates GL entries)' })
  async pay(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.pay(id, body, userId);
  }
}
