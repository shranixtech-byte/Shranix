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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BankAccountsService, type BankAccountInput } from '../services/bank-accounts.service';

@ApiTags('Multi-Company - Bank Accounts')
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'List bank accounts (optionally filtered by companyId)' })
  async findAll(@Query('companyId') companyId?: string) {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Get bank account by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('companies.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a bank account' })
  async create(@Body() body: BankAccountInput, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Post(':id/default')
  @Roles('admin', 'manager')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a bank account as default' })
  async setDefault(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.setDefault(id, companyId, userId);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a bank account' })
  async update(
    @Param('id') id: string,
    @Body() body: BankAccountInput,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('companies.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a bank account' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.softDelete(id, userId);
    return { deleted: true };
  }
}
