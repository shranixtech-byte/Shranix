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
  PostMovementDto,
  PostTransferDto,
  ReverseMovementDto,
  ReserveStockDto,
  ReleaseReservationDto,
  StockCardDto,
  MovementReportDto,
} from './dto';
import {
  InventoryPostingEngine,
  StockReservationService,
  StockReversalService,
  StockLedgerQueryService,
  StockReconciliationService,
} from './services';

// ═════════════════════════════════════════════════════════
// STEP 20: Inventory Posting Controller
// ═════════════════════════════════════════════════════════
@ApiTags('Inventory - Posting Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/posting')
export class InventoryPostingController {
  constructor(private readonly postingEngine: InventoryPostingEngine) {}

  @Post('movement')
  @Roles('admin', 'manager')
  @Permissions('inventory.ledger.post')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post an inventory movement (IN/OUT/TRANSFER)' })
  @ApiResponse({ status: 201, description: 'Movement posted' })
  async postMovement(@Body() dto: PostMovementDto, @CurrentUser() u: { id: string }) {
    return this.postingEngine.postMovement({
      ...dto,
      direction: dto.direction as any,
      createdBy: u?.id,
    });
  }

  @Post('transfer')
  @Roles('admin', 'manager')
  @Permissions('inventory.ledger.post')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a warehouse transfer (OUT from source, IN to destination)' })
  @ApiResponse({ status: 201, description: 'Transfer posted' })
  async postTransfer(@Body() dto: PostTransferDto, @CurrentUser() u: { id: string }) {
    return this.postingEngine.postTransfer({ ...dto, createdBy: u?.id });
  }

  @Post('reverse')
  @Roles('admin', 'manager')
  @Permissions('inventory.ledger.reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a previous stock movement with audit trail' })
  @ApiResponse({ status: 200, description: 'Movement reversed' })
  async reverseMovement(@Body() dto: ReverseMovementDto, @CurrentUser() u: { id: string }) {
    return this.postingEngine.reverseMovement(dto.entryNumber, dto.reason, u?.id);
  }
}

// ═════════════════════════════════════════════════════════
// STEP 20: Stock Reservation Controller
// ═════════════════════════════════════════════════════════
@ApiTags('Inventory - Stock Reservations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/reservations')
export class StockReservationController {
  constructor(private readonly reservationService: StockReservationService) {}

  @Post()
  @Roles('admin', 'manager')
  @Permissions('inventory.stock.reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve stock against an item/warehouse' })
  @ApiResponse({ status: 201, description: 'Stock reserved' })
  async reserveStock(@Body() dto: ReserveStockDto, @CurrentUser() u: { id: string }) {
    return this.reservationService.reserveStock({ ...dto, createdBy: u?.id });
  }

  @Post('release')
  @Roles('admin', 'manager')
  @Permissions('inventory.stock.release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a stock reservation' })
  @ApiResponse({ status: 200, description: 'Reservation released' })
  async releaseReservation(@Body() dto: ReleaseReservationDto, @CurrentUser() u: { id: string }) {
    return this.reservationService.releaseReservation(dto.reservationId, u?.id);
  }

  @Get('active/:itemId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active reservations for an item' })
  @ApiResponse({ status: 200, description: 'Active reservations' })
  async getActiveReservations(
    @Param('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.reservationService.getActiveReservations(itemId, warehouseId);
  }

  @Get('quantity/:itemId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get total reserved quantity for an item' })
  @ApiResponse({ status: 200, description: 'Reserved quantity' })
  async getReservedQuantity(
    @Param('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const qty = await this.reservationService.getReservedQuantity(itemId, warehouseId);
    return { itemId, warehouseId, reservedQuantity: qty };
  }
}

// ═════════════════════════════════════════════════════════
// STEP 20: Stock Reversal Controller
// ═════════════════════════════════════════════════════════
@ApiTags('Inventory - Stock Reversals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/reversals')
export class StockReversalController {
  constructor(private readonly reversalService: StockReversalService) {}

  @Post()
  @Roles('admin', 'manager')
  @Permissions('inventory.ledger.reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a stock movement' })
  @ApiResponse({ status: 200, description: 'Movement reversed' })
  async reverseMovement(@Body() dto: ReverseMovementDto, @CurrentUser() u: { id: string }) {
    return this.reversalService.reverseMovement({
      entryNumber: dto.entryNumber,
      reason: dto.reason,
      userId: u?.id,
    });
  }
}

// ═════════════════════════════════════════════════════════
// H1: Stock Ledger Reconciliation (report-only)
// ═════════════════════════════════════════════════════════
@ApiTags('Inventory - Stock Ledger Reconciliation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/reconciliation')
export class StockReconciliationController {
  constructor(private readonly reconciliationService: StockReconciliationService) {}

  @Get('stock')
  @Roles('admin', 'manager')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a report-only stock ledger reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation report (never mutates data)' })
  async run() {
    return this.reconciliationService.run();
  }
}

// ═════════════════════════════════════════════════════════
// STEP 20: Stock Ledger Query Controller
// ═════════════════════════════════════════════════════════
@ApiTags('Inventory - Stock Ledger Queries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/stock-ledger')
export class StockLedgerQueryController {
  constructor(private readonly ledgerQueryService: StockLedgerQueryService) {}

  @Get('card/:itemId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock card for an item' })
  @ApiResponse({ status: 200, description: 'Stock card entries' })
  async getStockCard(@Param('itemId') itemId: string, @Query() q: StockCardDto) {
    return this.ledgerQueryService.getStockCard(itemId, q.warehouseId, q.fromDate, q.toDate);
  }

  @Get('balances')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock balance summary' })
  @ApiResponse({ status: 200, description: 'Balance records' })
  async getStockBalances(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.ledgerQueryService.getStockBalances(warehouseId, itemId);
  }

  @Get('movements')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock movement report' })
  @ApiResponse({ status: 200, description: 'Movement records' })
  async getMovementReport(@Query() q: MovementReportDto) {
    return this.ledgerQueryService.getMovementReport({
      transactionType: q.transactionType,
      direction: q.direction,
      fromDate: q.fromDate,
      toDate: q.toDate,
      warehouseId: q.warehouseId,
      itemId: q.itemId,
      page: q.page || 1,
      pageSize: q.pageSize || 50,
    });
  }

  @Get('query')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.ledger.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query stock ledger with custom filters' })
  @ApiResponse({ status: 200, description: 'Ledger entries' })
  async queryLedger(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.ledgerQueryService.queryLedger({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      search,
    });
  }
}
