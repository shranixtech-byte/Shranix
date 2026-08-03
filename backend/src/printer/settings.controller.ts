import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { PrinterSettingsService } from './settings.service';

@ApiTags('Printer Settings')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('printer/settings')
export class PrinterSettingsController {
  constructor(private readonly service: PrinterSettingsService) {}

  @Get()
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get printer settings (printers, paper, margins, copies)' })
  @ApiResponse({ status: 200, description: 'Printer settings object' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @Permissions('finance.update')
  @ApiOperation({ summary: 'Update printer settings (KV upsert, whitelisted keys)' })
  @ApiResponse({ status: 200, description: 'Updated settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body || {});
  }
}
