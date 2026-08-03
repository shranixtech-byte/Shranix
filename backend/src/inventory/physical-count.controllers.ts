import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreatePhysicalCountDto,
  UpdatePhysicalCountDto,
  CreateCountItemDto,
  UpdateCountItemDto,
  VerifyCountDto,
  ApproveCountDto,
  CompleteCountDto,
  RejectCountDto,
  CancelCountDto,
  GenerateAdjustmentDto,
} from './dto';
import { PhysicalCountService } from './services';

@ApiTags('Inventory - Physical Count & Cycle Counting')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/physical-counts')
export class PhysicalCountController {
  constructor(private readonly countService: PhysicalCountService) {}

  // ─── COUNT HEADER CRUD ───────────────────────────────────

  @Post()
  @Roles('admin', 'manager')
  @Permissions('inventory.count.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create physical count document with items' })
  @ApiResponse({ status: 201, description: 'Count created' })
  async create(@Body() dto: CreatePhysicalCountDto, @CurrentUser() u: { id: string }) {
    return this.countService.createCount({ ...dto, createdBy: u?.id });
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List physical counts' })
  @ApiResponse({ status: 200, description: 'Paginated counts' })
  async findAll(
    @Query('page') p = 1,
    @Query('ps') ps = 50,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('countType') countType?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.countService.listCounts({
      page: Number(p),
      pageSize: Number(ps),
      search: q,
      status,
      countType,
      warehouseId,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get count with items' })
  @ApiResponse({ status: 200, description: 'Count details' })
  async findOne(@Param('id') id: string) {
    return this.countService.getCountDetails(id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update count header' })
  @ApiResponse({ status: 200, description: 'Count updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePhysicalCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.updateCount(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete draft count' })
  @ApiResponse({ status: 200, description: 'Count deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.countService.deleteCount(id, u?.id);
  }

  // ─── ITEM MANAGEMENT ─────────────────────────────────────

  @Post(':id/items')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to count' })
  @ApiResponse({ status: 201, description: 'Count item created' })
  async addItem(
    @Param('id') id: string,
    @Body() dto: CreateCountItemDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.addCountItem(id, dto, u?.id);
  }

  @Put(':id/items/:itemId')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update count item (enter counted qty)' })
  @ApiResponse({ status: 200, description: 'Count item updated' })
  async updateItem(
    @Param('id') _id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCountItemDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.updateCountItem(itemId, dto, u?.id);
  }

  @Delete(':id/items/:itemId')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from count' })
  @ApiResponse({ status: 200, description: 'Count item removed' })
  async removeItem(
    @Param('id') _id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.removeCountItem(itemId, u?.id);
  }

  // ─── WORKFLOW ────────────────────────────────────────────

  @Post(':id/assign')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign count to user' })
  @ApiResponse({ status: 200, description: 'Count assigned' })
  async assign(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.assignCount(id, body.assignedTo, u?.id);
  }

  @Post(':id/start')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start counting (in progress)' })
  @ApiResponse({ status: 200, description: 'Counting started' })
  async start(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.countService.startCount(id, u?.id);
  }

  @Post(':id/submit')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit count for verification' })
  @ApiResponse({ status: 200, description: 'Count submitted' })
  async submit(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.countService.submitCount(id, u?.id);
  }

  @Post(':id/verify')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify count items' })
  @ApiResponse({ status: 200, description: 'Count verified' })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.verifyCount(id, dto, u?.id);
  }

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve count and create stock adjustments for variances' })
  @ApiResponse({ status: 200, description: 'Count approved with adjustments' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.approveCount(id, dto, u?.id);
  }

  @Post(':id/complete')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark count as completed' })
  @ApiResponse({ status: 200, description: 'Count completed' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.completeCount(id, dto, u?.id);
  }

  @Post(':id/reject')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject count' })
  @ApiResponse({ status: 200, description: 'Count rejected' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.rejectCount(id, dto, u?.id);
  }

  @Post(':id/cancel')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel count' })
  @ApiResponse({ status: 200, description: 'Count cancelled' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelCountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.cancelCount(id, dto, u?.id);
  }

  // ─── ADJUSTMENT GENERATION ──────────────────────────────

  @Post(':id/generate-adjustment')
  @Roles('admin', 'manager')
  @Permissions('inventory.count.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate stock adjustment from count variances (Step 22)' })
  @ApiResponse({ status: 200, description: 'Stock adjustment created' })
  async generateAdjustment(
    @Param('id') id: string,
    @Body() dto: GenerateAdjustmentDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.countService.generateAdjustmentFromCount(id, dto, u?.id);
  }

  // ─── DASHBOARD ──────────────────────────────────────────

  @Get('dashboard/stats')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Physical count dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    return this.countService.getDashboard();
  }

  // ─── REPORTS ────────────────────────────────────────────

  @Get('reports/register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Physical count register report' })
  @ApiResponse({ status: 200, description: 'Count register' })
  async getRegisterReport(
    @Query('status') status?: string,
    @Query('countType') countType?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.countService.getReport({
      status,
      countType,
      warehouseId,
      fromDate,
      toDate,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
    });
  }

  @Get('reports/variance')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Variance report' })
  @ApiResponse({ status: 200, description: 'Variance data' })
  async getVarianceReport(
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.countService.getVarianceReport({ warehouseId, fromDate, toDate });
  }

  @Get('reports/abc')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ABC count report' })
  @ApiResponse({ status: 200, description: 'ABC count data' })
  async getABCReport() {
    return this.countService.getABCReport();
  }

  @Get('reports/accuracy')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.count.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warehouse accuracy report' })
  @ApiResponse({ status: 200, description: 'Accuracy metrics' })
  async getAccuracyReport(@Query('warehouseId') warehouseId?: string) {
    return this.countService.getAccuracyReport(warehouseId);
  }
}
