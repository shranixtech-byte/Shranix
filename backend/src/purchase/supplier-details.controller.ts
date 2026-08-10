import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateSupplierContactDto,
  SupplierAddressDto,
  SupplierCategoryDto,
  SupplierContactDto,
  SupplierDocumentDto,
  SupplierGroupDto,
} from './dto';
import { SuppliersService } from './suppliers.service';

/**
 * Nested child resources of the supplier master.
 * Note: these route patterns never collide with @Get(':id') because they
 * always carry a static segment (e.g. ":id/addresses").
 */
@ApiTags('Purchase - Supplier Master (addresses / contacts / documents)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SupplierDetailsController {
  constructor(private readonly service: SuppliersService) {}

  // ── ADDRESSES ──────────────────────────────────────────────
  @Get(':id/addresses')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier addresses (billing / shipping / branch)' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  async listAddresses(@Param('id') id: string) {
    return this.service.listAddresses(id);
  }

  @Post(':id/addresses')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a supplier address' })
  @ApiBody({ type: SupplierAddressDto })
  async createAddress(
    @Param('id') id: string,
    @Body() dto: SupplierAddressDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createAddress(id, dto as any, u?.id);
  }

  @Put(':id/addresses/:addressId')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier address' })
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: SupplierAddressDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateAddress(id, addressId, dto as any, u?.id);
  }

  @Delete(':id/addresses/:addressId')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a supplier address' })
  async deleteAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.deleteAddress(id, addressId, u?.id);
  }

  // ── CONTACTS ───────────────────────────────────────────────
  @Get(':id/contacts')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier contacts (owner / accounts / purchase / sales)' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  async listContacts(@Param('id') id: string) {
    return this.service.listContacts(id);
  }

  @Post(':id/contacts')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a supplier contact' })
  @ApiBody({ type: CreateSupplierContactDto })
  async createContact(
    @Param('id') id: string,
    @Body() dto: CreateSupplierContactDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createContact(id, dto as any, u?.id);
  }

  @Put(':id/contacts/:contactId')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier contact' })
  async updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: SupplierContactDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateContact(id, contactId, dto as any, u?.id);
  }

  @Delete(':id/contacts/:contactId')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a supplier contact' })
  async deleteContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.deleteContact(id, contactId, u?.id);
  }

  // ── DOCUMENTS ──────────────────────────────────────────────
  @Get(':id/documents')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier documents (GST cert / PAN / agreement / license)' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  async listDocuments(@Param('id') id: string) {
    return this.service.listDocuments(id);
  }

  @Post(':id/documents')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a supplier document record' })
  @ApiBody({ type: SupplierDocumentDto })
  async createDocument(
    @Param('id') id: string,
    @Body() dto: SupplierDocumentDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createDocument(id, dto as any, u?.id);
  }

  @Delete(':id/documents/:documentId')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a supplier document record' })
  async deleteDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.deleteDocument(id, documentId, u?.id);
  }
}

/**
 * Reference data for the supplier master — groups & categories.
 */
@ApiTags('Purchase - Supplier Master (groups / categories)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('supplier-groups')
export class SupplierGroupsController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List supplier groups (Retail Supplier / Manufacturer / Distributor / …)',
  })
  async list() {
    return this.service.listGroups();
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier group' })
  @ApiBody({ type: SupplierGroupDto })
  async create(@Body() dto: SupplierGroupDto, @CurrentUser() u: { id: string }) {
    return this.service.createGroup(dto as any, u?.id);
  }
}

@ApiTags('Purchase - Supplier Master (groups / categories)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('supplier-categories')
export class SupplierCategoriesController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier categories (A / B / C / Premium / Preferred)' })
  async list() {
    return this.service.listCategories();
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier category' })
  @ApiBody({ type: SupplierCategoryDto })
  async create(@Body() dto: SupplierCategoryDto, @CurrentUser() u: { id: string }) {
    return this.service.createCategory(dto as any, u?.id);
  }
}
