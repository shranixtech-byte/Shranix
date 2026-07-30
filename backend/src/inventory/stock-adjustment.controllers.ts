import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { EnterpriseAdjustmentService } from './services';
import {
  CreateAdjustmentDocumentDto,
} from './dto';

@ApiTags('Inventory - Stock Adjustments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/stock-adjustments')
export class EnterpriseAdjustmentController {
  constructor(private readonly adjustmentService: EnterpriseAdjustmentService) {}

  @Post()
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create stock adjustment document with items' })
  @ApiResponse({ status: 201, description: 'Adjustment created' })
  async create(@Body() dto: CreateAdjustmentDocumentDto, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.createAdjustment({
      ...dto,
      items: dto.items.map(i => ({ ...i })),
      createdBy: u?.id,
    });
  }

  @Get()
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List stock adjustments' })
  @ApiResponse({ status: 200, description: 'Paginated adjustments' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) {
    return this.adjustmentService.listAdjustments({ page: Number(p), pageSize: Number(ps), search: q });
  }

  @Get(':id')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get adjustment with items' })
  @ApiResponse({ status: 200, description: 'Adjustment details' })
  async findOne(@Param('id') id: string) {
    return this.adjustmentService.getAdjustmentDetails(id);
  }

  @Post(':id/submit')
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit adjustment for approval' })
  @ApiResponse({ status: 200, description: 'Adjustment submitted' })
  async submit(@Param('id') id: string, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.submitAdjustment(id, u?.id);
  }

  @Post(':id/approve')
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and post adjustment — posts to InventoryPostingEngine' })
  @ApiResponse({ status: 200, description: 'Adjustment posted' })
  async approve(@Param('id') id: string, @Body() body: { approvalNotes?: string }, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.approveAndPostAdjustment(id, body.approvalNotes, u?.id);
  }

  @Post(':id/reject')
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment rejected' })
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.rejectAdjustment(id, body.reason, u?.id);
  }

  @Post(':id/cancel')
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment cancelled' })
  async cancel(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.cancelAdjustment(id, body.reason, u?.id);
  }

  @Post(':id/reverse')
  @Roles('admin','manager')
  @Permissions('inventory.adjustment.reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a posted adjustment — creates reversal + ledger reversal' })
  @ApiResponse({ status: 200, description: 'Adjustment reversed' })
  async reverse(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) {
    return this.adjustmentService.reverseAdjustment(id, body.reason, u?.id);
  }

  @Get('dashboard/stats')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjustment dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    return this.adjustmentService.getDashboard();
  }

  @Get('reports/register')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjustment register report' })
  @ApiResponse({ status: 200, description: 'Adjustment register' })
  async getReport(
    @Query('adjustmentType') adjustmentType?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adjustmentService.getReport({ adjustmentType, status, warehouseId, fromDate, toDate, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }

  @Get('reports/damage')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Damage report' })
  @ApiResponse({ status: 200, description: 'Damage adjustments' })
  async getDamageReport() {
    return this.adjustmentService.getReport({ adjustmentType: 'damage', pageSize: 1000 });
  }

  @Get('reports/scrap')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scrap report' })
  @ApiResponse({ status: 200, description: 'Scrap adjustments' })
  async getScrapReport() {
    return this.adjustmentService.getReport({ adjustmentType: 'scrap', pageSize: 1000 });
  }

  @Get('reports/expiry')
  @Roles('admin','manager','accountant')
  @Permissions('inventory.adjustment.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expiry write-off report' })
  @ApiResponse({ status: 200, description: 'Expiry adjustments' })
  async getExpiryReport() {
    return this.adjustmentService.getReport({ adjustmentType: 'expiry_write_off', pageSize: 1000 });
  }
}
