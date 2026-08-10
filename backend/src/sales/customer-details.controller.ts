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

import { CustomersService } from './customers.service';
import { CustomerAddressDto, CustomerContactDto, CustomerDocumentDto } from './dto';

/**
 * Nested child resources of the customer master.
 * Note: these route patterns never collide with @Get(':id') because they
 * always carry a static segment (e.g. ":id/addresses").
 */
@ApiTags('Sales - Customer Master (addresses / contacts / documents)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerDetailsController {
  constructor(private readonly service: CustomersService) {}

  // ── ADDRESSES ──────────────────────────────────────────────
  @Get(':id/addresses')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customer addresses (billing / shipping / branch)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async listAddresses(@Param('id') id: string) {
    return this.service.listAddresses(id);
  }

  @Post(':id/addresses')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a customer address' })
  @ApiBody({ type: CustomerAddressDto })
  async createAddress(
    @Param('id') id: string,
    @Body() dto: CustomerAddressDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createAddress(id, dto, u?.id);
  }

  @Put(':id/addresses/:addressId')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer address' })
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: CustomerAddressDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateAddress(id, addressId, dto, u?.id);
  }

  @Delete(':id/addresses/:addressId')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer address' })
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
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customer contacts (owner / accounts / purchase / sales)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async listContacts(@Param('id') id: string) {
    return this.service.listContacts(id);
  }

  @Post(':id/contacts')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a customer contact' })
  @ApiBody({ type: CustomerContactDto })
  async createContact(
    @Param('id') id: string,
    @Body() dto: CustomerContactDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createContact(id, dto, u?.id);
  }

  @Put(':id/contacts/:contactId')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer contact' })
  async updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: CustomerContactDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateContact(id, contactId, dto, u?.id);
  }

  @Delete(':id/contacts/:contactId')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer contact' })
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
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customer documents (GST certificate, PAN, agreement, …)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async listDocuments(@Param('id') id: string) {
    return this.service.listDocuments(id);
  }

  @Post(':id/documents')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a customer document (name + optional file URL)' })
  @ApiBody({ type: CustomerDocumentDto })
  async createDocument(
    @Param('id') id: string,
    @Body() dto: CustomerDocumentDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.createDocument(id, dto, u?.id);
  }

  @Delete(':id/documents/:documentId')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer document' })
  async deleteDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.deleteDocument(id, documentId, u?.id);
  }
}
