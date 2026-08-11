import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import {
  BusinessRulesController,
  CustomFieldsController,
  TagsController,
  GlobalSearchController,
  BusinessControlController,
} from './controllers/control.controller';
import { BusinessControlService } from './services/business-control.service';
import { BusinessRulesService } from './services/business-rules.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { GlobalSearchService } from './services/global-search.service';
import { TagsService } from './services/tags.service';

@Module({
  imports: [CommonModule],
  controllers: [
    BusinessRulesController,
    CustomFieldsController,
    TagsController,
    GlobalSearchController,
    BusinessControlController,
  ],
  providers: [
    BusinessRulesService,
    CustomFieldsService,
    TagsService,
    GlobalSearchService,
    BusinessControlService,
  ],
  exports: [
    BusinessRulesService,
    CustomFieldsService,
    TagsService,
    GlobalSearchService,
    BusinessControlService,
  ],
})
export class ControlModule {}
