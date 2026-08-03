import {
  Controller,
  Get,
  Post,
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
  CreateTransferDocumentDto,
  ReceiveTransferDto,
  RejectTransferDto,
  CancelTransferDto,
  ApproveTransferDto,
  InTransitTransferDto,
  TransferReportQueryDto,
} from './dto';
import { EnterpriseTransferService } from './services';

@ApiTags('Inventory - Stock Transfers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/stock-transfers')
export class EnterpriseTransferController {
  constructor(private readonly transferService: EnterpriseTransferService) {}

  @Post()
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create stock transfer document with items' })
  @ApiResponse({ status: 201, description: 'Transfer created' })
  async create(@Body() dto: CreateTransferDocumentDto, @CurrentUser() u: { id: string }) {
    return this.transferService.createTransfer({
      ...dto,
      items: dto.items.map((i) => ({ ...i })),
      createdBy: u?.id,
    });
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List stock transfers' })
  @ApiResponse({ status: 200, description: 'Paginated transfers' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('q') q?: string) {
    return this.transferService.listTransfers({ page: Number(p), pageSize: Number(ps), search: q });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transfer with items' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  async findOne(@Param('id') id: string) {
    return this.transferService.getTransferDetails(id);
  }

  @Post(':id/submit')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit transfer for approval' })
  @ApiResponse({ status: 200, description: 'Transfer submitted' })
  async submit(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.transferService.submitTransfer(id, u?.id);
  }

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve transfer — posts OUT ledger entry' })
  @ApiResponse({ status: 200, description: 'Transfer approved' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveTransferDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.transferService.approveTransfer(id, dto.approvalNotes, u?.id);
  }

  @Post(':id/in-transit')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark transfer as in-transit' })
  @ApiResponse({ status: 200, description: 'Transfer in transit' })
  async markInTransit(
    @Param('id') id: string,
    @Body() dto: InTransitTransferDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.transferService.markInTransit(id, dto.expectedArrival, dto.transitNotes, u?.id);
  }

  @Post('receive')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive transfer — posts IN ledger entry' })
  @ApiResponse({ status: 200, description: 'Transfer received' })
  async receive(@Body() dto: ReceiveTransferDto, @CurrentUser() u: { id: string }) {
    return this.transferService.receiveTransfer({
      id: dto.id,
      items: dto.items?.map((i) => ({ ...i })),
      userId: u?.id,
    });
  }

  @Post(':id/reject')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectTransferDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.transferService.rejectTransfer(id, dto.reason, u?.id);
  }

  @Post(':id/cancel')
  @Roles('admin', 'manager')
  @Permissions('inventory.transfer.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel transfer (auto-reverses ledger if needed)' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelTransferDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.transferService.cancelTransfer(id, dto.reason, u?.id);
  }

  @Get('dashboard/stats')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    return this.transferService.getDashboard();
  }

  @Get('reports/register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer register report' })
  @ApiResponse({ status: 200, description: 'Transfer register' })
  async getReport(@Query() q: TransferReportQueryDto) {
    return this.transferService.getReport({
      status: q.status,
      sourceWarehouseId: q.sourceWarehouseId,
      destinationWarehouseId: q.destinationWarehouseId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      page: q.page || 1,
      pageSize: q.pageSize || 50,
    });
  }

  @Get('reports/pending')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pending transfers report' })
  @ApiResponse({ status: 200, description: 'Pending transfers' })
  async getPending() {
    return this.transferService.getReport({ status: 'pending_approval', pageSize: 1000 });
  }

  @Get('reports/transit')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.transfer.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'In-transit transfers report' })
  @ApiResponse({ status: 200, description: 'Transit transfers' })
  async getTransit() {
    return this.transferService.getReport({ status: 'in_transit', pageSize: 1000 });
  }
}
